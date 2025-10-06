# ダンドリワークAPI仕様書

## 基本情報
- **ベースURL**: `https://api.dandoli.jp/api`
- **認証方式**: Bearer Token
- **環境変数**: `DW_BEARER_TOKEN`

## エンドポイント

### 1. 現場一覧取得

**エンドポイント**: `GET /co/places/{place_code}/sites`

**説明**: 指定したplace_codeに紐づく現場一覧を取得

**パラメータ**:
- `place_code` (パスパラメータ, 必須): プレイスコード
  - 例: `dandoli-sample1`

**リクエストヘッダー**:
```
Authorization: Bearer {DW_BEARER_TOKEN}
Content-Type: application/json
```

**リクエスト例**:
```bash
curl -X GET \
  'https://api.dandoli.jp/api/co/places/dandoli-sample1/sites' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**レスポンス例** (成功時):
```json
{
  "result": true,
  "data": [
    {
      "site_code": "SITE001",
      "name": "〇〇マンション新築工事",
      "address": "東京都渋谷区〇〇1-2-3",
      "site_type": "建築工事",
      "status": "進行中",
      "manager_name": "田中太郎",
      "sub_manager_name": "鈴木一郎",
      "updated_at": "2025-10-03T10:30:00Z",
      "created_at": "2025-09-01T09:00:00Z",
      "place_code": "dandoli-sample1"
    }
  ]
}
```

**レスポンスフィールド**:
- `result` (boolean): APIコールの成功/失敗
- `data` (array): 現場情報の配列
  - `site_code` (string): 現場コード
  - `name` (string): 現場名
  - `address` (string): 住所
  - `site_type` (string): 工事種別
  - `status` (string): ステータス
  - `manager_name` (string): 現場責任者名
  - `sub_manager_name` (string): 副責任者名
  - `updated_at` (string): 更新日時 (ISO 8601)
  - `created_at` (string): 作成日時 (ISO 8601)
  - `place_code` (string): プレイスコード

**エラーレスポンス**:
```json
{
  "error": "place_code is required",
  "status": 400
}
```

## 実装例

### Next.js API Route (`app/api/dandori/sites/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';

const DW_API_BASE = process.env.NEXT_PUBLIC_DW_API_BASE!;
const BEARER_TOKEN = process.env.DW_BEARER_TOKEN!;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placeCode = searchParams.get('place_code');

    if (!placeCode) {
      return NextResponse.json(
        { error: 'place_code is required' },
        { status: 400 }
      );
    }

    const url = `${DW_API_BASE}/co/places/${placeCode}/sites`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sites', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Sites fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
```

### フロントエンド使用例 (`app/sites/page.tsx`)

```typescript
const placeCode = process.env.NEXT_PUBLIC_PLACE_CODE || 'dandoli-sample1';

const response = await fetch(`/api/dandori/sites?place_code=${placeCode}`);
const data = await response.json();

if (data.result && data.data) {
  const sites = data.data.map((site: any) => ({
    site_code: site.site_code,
    site_name: site.name,
    address: site.address,
    // ... その他のフィールド
  }));
}
```

## 環境変数

`.env.local`:
```bash
NEXT_PUBLIC_DW_API_BASE=https://api.dandoli.jp/api
DW_BEARER_TOKEN=your_bearer_token_here
NEXT_PUBLIC_PLACE_CODE=dandoli-sample1
```

## 注意事項

1. **Bearer Tokenの管理**
   - トークンは`.env.local`で管理
   - 絶対にGitにコミットしない
   - サーバーサイド（API Route）でのみ使用

2. **エラーハンドリング**
   - 必ず`try-catch`で囲む
   - ユーザーに適切なエラーメッセージを表示

3. **レート制限**
   - API呼び出しの頻度に注意
   - 必要に応じてキャッシュを実装

4. **データ整形**
   - APIレスポンスの`name`フィールドを`site_name`に変換
   - フロントエンドで期待される形式に整形

## 更新履歴

- 2025-10-06: Day 7 - 現場一覧取得API連携実装完了
