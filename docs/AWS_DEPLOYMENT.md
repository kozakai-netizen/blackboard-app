# AWS本番デプロイ戦略

## アーキテクチャ概要

```
ユーザー
  ↓ HTTPS
CloudFront (WAF付)
  ├─ /static/* → S3 (画像・CSS・JS)
  ├─ /api/* → ALB → ECS Fargate (Next.js SSR)
  └─ /_next/static/* → S3 (Next.js静的アセット)
```

---

## 1. フロント配信（高スケール・低レイテンシ）

### CloudFront設定

```yaml
# cloudfront-distribution.yml
Distributions:
  - OriginGroups:
      # Origin 1: S3（静的アセット）
      - DomainName: blackboard-app-static.s3.amazonaws.com
        OriginPath: /production
        S3OriginConfig:
          OriginAccessIdentity: origin-access-identity/cloudfront/XXXXX

      # Origin 2: ALB（SSR）
      - DomainName: alb-blackboard.ap-northeast-1.elb.amazonaws.com
        CustomOriginConfig:
          HTTPSPort: 443
          OriginProtocolPolicy: https-only

  Behaviors:
    # 静的アセット → S3
    - PathPattern: /_next/static/*
      TargetOriginId: S3Origin
      CachePolicyId: CachingOptimized
      Compress: true

    - PathPattern: /images/*
      TargetOriginId: S3Origin
      CachePolicyId: CachingOptimized

    # SSR → ALB
    - PathPattern: /api/*
      TargetOriginId: ALBOrigin
      CachePolicyId: CachingDisabled
      AllowedMethods: [GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE]

    # デフォルト → ALB
    - PathPattern: /*
      TargetOriginId: ALBOrigin
      CachePolicyId: CachingOptimized
      MinTTL: 0
      DefaultTTL: 0
      MaxTTL: 31536000

  WAF:
    WebACLId: arn:aws:wafv2:us-east-1:ACCOUNT:global/webacl/blackboard-waf/ID
    Rules:
      # レートリミット: IPあたり100req/5min
      - Name: RateLimitRule
        Priority: 1
        Statement:
          RateBasedStatement:
            Limit: 100
            AggregateKeyType: IP

      # ボット対策
      - Name: AWSManagedRulesCommonRuleSet
        Priority: 2
        Statement:
          ManagedRuleGroupStatement:
            VendorName: AWS
            Name: AWSManagedRulesCommonRuleSet
```

---

## 2. SSR実行環境（ECS Fargate）

### Task Definition

```json
{
  "family": "blackboard-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "nextjs-app",
      "image": "ACCOUNT.dkr.ecr.ap-northeast-1.amazonaws.com/blackboard-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "NEXT_PUBLIC_FEATURE_DANDORI_CATEGORIES",
          "value": "on"
        }
      ],
      "secrets": [
        {
          "name": "DW_BEARER_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:ACCOUNT:secret:blackboard/dandori-token"
        },
        {
          "name": "SUPABASE_SERVICE_ROLE_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:ACCOUNT:secret:blackboard/supabase-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/blackboard-app",
          "awslogs-region": "ap-northeast-1",
          "awslogs-stream-prefix": "nextjs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Service定義（AutoScaling）

```yaml
# ecs-service.yml
Service:
  ServiceName: blackboard-app
  Cluster: production-cluster
  TaskDefinition: blackboard-app:REVISION
  DesiredCount: 2  # 最小2台（AZ冗長）

  LoadBalancers:
    - TargetGroupArn: arn:aws:elasticloadbalancing:...
      ContainerName: nextjs-app
      ContainerPort: 3000

  NetworkConfiguration:
    AwsvpcConfiguration:
      Subnets:
        - subnet-private-1a
        - subnet-private-1c
      SecurityGroups:
        - sg-ecs-app

  AutoScaling:
    MinCapacity: 2
    MaxCapacity: 10

    # スケーリングポリシー1: RequestCount
    TargetTrackingScaling:
      - PolicyName: RequestCountScaling
        TargetValue: 1000  # ALBリクエスト数/タスク
        ScaleInCooldown: 300
        ScaleOutCooldown: 60

    # スケーリングポリシー2: CPU
    TargetTrackingScaling:
      - PolicyName: CPUScaling
        TargetValue: 70  # CPU使用率70%
        ScaleInCooldown: 300
        ScaleOutCooldown: 60
```

### Dockerfile（最適化版）

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# 依存関係インストール
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# ビルド
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 実行環境
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 必要ファイルのみコピー
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# ヘルスチェック用エンドポイント作成
RUN echo '{"status":"ok"}' > public/health.json

EXPOSE 3000

CMD ["npm", "start"]
```

---

## 3. 画像アップロード/配信

### S3バケット設定

```yaml
# s3-bucket.yml
Buckets:
  - BucketName: blackboard-app-uploads
    LifecycleConfiguration:
      Rules:
        # 30日後にIA移行
        - Id: MoveToIA
          Status: Enabled
          Transitions:
            - Days: 30
              StorageClass: STANDARD_IA

        # 1年後にGlacier移行
        - Id: MoveToGlacier
          Status: Enabled
          Transitions:
            - Days: 365
              StorageClass: GLACIER

    CorsConfiguration:
      CorsRules:
        - AllowedOrigins: ['https://blackboard.example.com']
          AllowedMethods: [GET, PUT, POST]
          AllowedHeaders: ['*']
          MaxAge: 3600

  - BucketName: blackboard-app-static
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      IgnorePublicAcls: true
      BlockPublicPolicy: false
      RestrictPublicBuckets: false
```

### 署名付きURL生成（Lambda）

```typescript
// lambda/generate-upload-url.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function handler(event: any) {
  const { fileName, contentType } = JSON.parse(event.body);

  const command = new PutObjectCommand({
    Bucket: 'blackboard-app-uploads',
    Key: `uploads/${Date.now()}-${fileName}`,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300, // 5分間有効
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ uploadUrl: signedUrl }),
  };
}
```

---

## 4. シークレット管理

### Secrets Manager

```bash
# Bearer Token
aws secretsmanager create-secret \
  --name blackboard/dandori-token \
  --description "ダンドリワークAPI Bearer Token" \
  --secret-string "4b8dfcab74cc1b3fac4cd523d01ac6a4"

# Supabase Key
aws secretsmanager create-secret \
  --name blackboard/supabase-key \
  --description "Supabase Service Role Key" \
  --secret-string "eyJhbGciOiJI..."
```

### SSM Parameter Store（フィーチャーフラグ）

```bash
# フィーチャーフラグ
aws ssm put-parameter \
  --name /blackboard/feature/dandori-categories \
  --type String \
  --value "on"

aws ssm put-parameter \
  --name /blackboard/feature/dandori-upload \
  --type String \
  --value "on"
```

---

## 5. 監視・アラート

### CloudWatch Alarms

```yaml
# cloudwatch-alarms.yml
Alarms:
  # 5xxエラー率
  - AlarmName: ECS-5xx-Error-Rate
    MetricName: HTTPCode_Target_5XX_Count
    Threshold: 10  # 5分間で10回以上
    EvaluationPeriods: 2
    ActionsEnabled: true
    AlarmActions:
      - arn:aws:sns:ap-northeast-1:ACCOUNT:alert-critical

  # レスポンスタイム（P99）
  - AlarmName: ECS-Response-Time-P99
    MetricName: TargetResponseTime
    Statistic: p99
    Threshold: 3000  # 3秒
    EvaluationPeriods: 3
    AlarmActions:
      - arn:aws:sns:ap-northeast-1:ACCOUNT:alert-warning

  # CPU使用率
  - AlarmName: ECS-CPU-High
    MetricName: CPUUtilization
    Threshold: 80  # 80%
    EvaluationPeriods: 2
    AlarmActions:
      - arn:aws:sns:ap-northeast-1:ACCOUNT:alert-warning

  # タスク異常終了
  - AlarmName: ECS-Task-Failed
    MetricName: TaskFailed
    Threshold: 1
    EvaluationPeriods: 1
    AlarmActions:
      - arn:aws:sns:ap-northeast-1:ACCOUNT:alert-critical
```

### X-Ray トレーシング

```typescript
// next.config.ts
import AWSXRay from 'aws-xray-sdk-core';

if (process.env.NODE_ENV === 'production') {
  AWSXRay.captureHTTPsGlobal(require('http'));
  AWSXRay.captureHTTPsGlobal(require('https'));
}
```

---

## 6. CI/CD パイプライン

### GitHub Actions

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/blackboard-app:$IMAGE_TAG .
          docker push $ECR_REGISTRY/blackboard-app:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster production-cluster \
            --service blackboard-app \
            --force-new-deployment
```

---

## 7. 数万人アクセス対策

### スロットリング設定

```typescript
// middleware.ts（API Rate Limit）
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, number[]>();

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分
  const maxRequests = 60; // 60req/min

  const requests = rateLimitMap.get(ip) || [];
  const recentRequests = requests.filter(time => now - time < windowMs);

  if (recentRequests.length >= maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  rateLimitMap.set(ip, [...recentRequests, now]);
  return NextResponse.next();
}
```

### Connection Pooling

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'Connection': 'keep-alive',
      },
    },
  }
);
```

---

## デプロイチェックリスト

- [ ] Dockerイメージビルド成功
- [ ] ECRプッシュ成功
- [ ] ECSタスク定義更新
- [ ] ヘルスチェック通過
- [ ] CloudFrontキャッシュクリア
- [ ] 監視アラート確認
- [ ] ロードテスト実施（数万req/min）
- [ ] ロールバック手順確認

---

## ロールバック手順

```bash
# 前バージョンにロールバック
aws ecs update-service \
  --cluster production-cluster \
  --service blackboard-app \
  --task-definition blackboard-app:PREVIOUS_REVISION

# CloudFrontキャッシュクリア
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```
