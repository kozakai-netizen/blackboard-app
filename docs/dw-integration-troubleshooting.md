# DW連携トラブルシューティング

**バージョン**: v1.0.0
**最終更新**: 2025-11-19

このドキュメントは、DW連携実装中に実際に発生したトラブルと解決方法をまとめたものです。

---

## 目次

1. [SSHトンネル切断で協力業者が0件になる問題](#sshトンネル切断で協力業者が0件になる問題)
2. [DW API 404/500エラーへの対処](#dw-api-404500エラーへの対処)
3. [.nextキャッシュ破損で404やWebpackエラー](#nextキャッシュ破損で404やwebpackエラー)
4. [協力業者で二重フィルタリング問題](#協力業者で二重フィルタリング問題)
5. [40364が元請けと誤判定される問題](#40364が元請けと誤判定される問題)
6. [ポート3000とポート3001の混同](#ポート3000とポート3001の混同)
7. [環境変数が読めない問題](#環境変数が読めない問題)
8. [useQueryBoolでWebpackエラー](#usequeryboolでwebpackエラー)

---

## SSHトンネル切断で協力業者が0件になる問題

### 症状

- 元請けユーザー（40824）: 全現場が表示される ✅
- 協力業者ユーザー（40364）: 0件表示、「該当する現場がありません」 ❌

### 原因

**SSHトンネル（ポート13306）が切断**されており、`v_my_sites`にアクセスできない。

協力業者の場合、API側で**必ず**`v_my_sites`を使って担当現場を取得するため、DB接続エラー時は500エラーを返して0件にする仕様になっている。

### 確認方法

サーバーログで以下のエラーが出ている:

```
[quicklist] fetchUserSitesMap error: connect ECONNREFUSED 127.0.0.1:13306
[quicklist] ❌ 協力業者モード: DB接続エラーのため0件を返します
```

または、ブラウザのNetwork tabで`/api/sites/quicklist`のレスポンスを確認:

```json
{
  "ok": false,
  "error": "db_connection_failed",
  "message": "データベース接続エラーが発生しました。担当現場情報を取得できません。",
  "userId": 40364,
  "placeId": 170,
  "userRole": "sub",
  "items": [],
  "total": 0
}
```

### 解決方法

#### 方法1: サーバーを正しく起動する

```bash
# ❌ 間違い: ポート3000（SSHトンネルなし）
npm run dev

# ✅ 正しい: ポート3001（SSHトンネル付き）
npm run dev:stg
```

#### 方法2: SSHトンネルを手動で確認

```bash
# SSHトンネルが起動しているか確認
lsof -i:13306

# 何も表示されなければ、手動でトンネルを起動
npm run tunnel:stg
```

#### 方法3: SSH接続をテスト

```bash
# DBに直接接続できるか確認
mysql -h 127.0.0.1 -P 13306 -u dandoliworks -p work

# パスワード入力後、接続できればOK
```

---

## DW API 404/500エラーへの対処

### 症状

サーバーログに以下が表示される:

```
[quicklist] DW 404, retrying after 800ms with cache-buster...
[quicklist] DW retry failed { status: 404, error: undefined }
```

### 原因

1. **DW APIのレスポンス遅延**（初回リクエストがタイムアウト）
2. **トークン不正**（Bearer Token の期限切れや誤り）
3. **place_code 誤り**（存在しないプレイス）

### 確認方法

#### 1. DW API を直接叩いてみる

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.dandoli.jp/api/co/places/dandoli-sample1/sites?site_status=1,2,3"
```

- **200 OK**: トークンとplace_codeが正しい
- **404 Not Found**: place_codeが間違っている
- **401 Unauthorized**: トークンが無効

#### 2. トークンを確認

`.env.local` の `DW_BEARER_TOKEN` が正しいか確認。

```bash
grep DW_BEARER_TOKEN .env.local
```

### 解決方法

#### 404エラーの場合

**リトライ機構**が自動で動作するため、800ms待機後に再試行します。

それでも失敗する場合は、**STG DBへフォールバック**します。

```typescript
// app/api/sites/quicklist/route.ts:294-316
if (!resp.ok || data === null) {
  retried = true;
  console.warn(`[quicklist] DW ${dwStatus}, retrying after 800ms with cache-buster...`);
  await sleep(800);
  const dw2Url = mkDwUrl(Date.now().toString()); // cache-buster付き
  // ... 再リトライ
}
```

#### STG DBフォールバック確認

```
[quicklist] RESULT provider: stg items: 80 timings: {...}
```

`provider: "stg"` になっていればフォールバック成功。

---

## .nextキャッシュ破損で404やWebpackエラー

### 症状

以下のようなエラーが発生:

```
GET /_next/static/chunks/webpack.js 404
GET /_next/static/css/app/layout.css 404
```

または:

```
Error: ENOENT: no such file or directory, open '/path/.next/...'
```

### 原因

`.next` フォルダがサーバー起動中に削除されたり、Webpackのビルドキャッシュが破損した。

### 解決方法

#### 方法1: .next削除 + 再起動

```bash
# サーバーを停止（Ctrl+C）
rm -rf .next
PORT=3001 npm run dev:stg
```

#### 方法2: クリーンビルド

```bash
# サーバーを停止
rm -rf .next node_modules
npm install
PORT=3001 npm run dev:stg
```

#### 方法3: ブラウザキャッシュクリア

1. ブラウザのDevTools を開く（F12）
2. Network タブを開く
3. 「Disable cache」にチェック
4. ページをリロード（Ctrl+Shift+R）

---

## 協力業者で二重フィルタリング問題

### 症状

**サーバーログ**:
```
[quicklist] 協力業者フィルター適用: 155件 → 15件
[quicklist] FINAL items length: 15 userRole: sub userId: 40364 only: false statusCodes: [ 1, 2, 3 ]
```

**ブラウザコンソール**:
```
[sites] SUB FILTER raw: 0 after: 0
```

APIは15件返しているのに、フロント側で0件になっている。

### 原因

**API側で既に協力業者フィルタを適用**しているのに、**フロント側で再度`includesUserLoose`でフィルタ**していた。

```typescript
// ❌ 間違った実装
const filteredItems = useMemo(() => {
  const raw: any[] = Array.isArray(res?.items) ? res.items : [];

  const filtered = raw.filter((site: any) => {
    // 🚨 協力業者でも onlyMine でフィルタしていた
    if (onlyMine) {
      if (!includesUserLoose(site, keySet)) {
        return false; // ← ここで全て除外されてしまう
      }
    }
    return true;
  });

  return filtered;
}, [res?.items, onlyMine, keySet]);
```

### 解決方法

**協力業者の場合は、フロント側で追加フィルタを行わない**ように修正。

```typescript
// ✅ 正しい実装
const isSubUser = sessionUser?.userRole === 'sub';

const filteredItems = useMemo(() => {
  const raw: any[] = Array.isArray(res?.items) ? res.items : [];

  const filtered = raw.filter((site: any) => {
    // 🎯 協力業者の場合は、APIが既にフィルタ済みなので
    // includesUserLoose による再フィルタリングは行わない
    if (!isSubUser && onlyMine) {
      if (keySet.size === 0) return false;
      if (!includesUserLoose(site, keySet)) return false;
    }

    return true;
  });

  return filtered;
}, [res?.items, onlyMine, keySet, isSubUser]);
```

**ポイント**: `!isSubUser && onlyMine` で、**元請けの場合のみ**keySetフィルタを適用。

---

## 40364が元請けと誤判定される問題

### 症状

user_id=40364 が `prime` と判定されてしまう。

```
[getRoleForPlace] user_id=40364 は元請け company_id (98315) のみ所属 → prime
```

### 原因

**ロール判定ロジックの誤り**。

当初の実装では「元請け company_id を持っていれば prime」としていたが、これは間違い。

DWの業者管理ロールにより、**協力業者が元請け company_id にも紐づくケース**があるため。

### 正しいロジック

**「協力業者 company_id を1つでも持っていれば sub」**

```typescript
// ✅ 正しい判定順序
// 1. 協力業者 company_id を持つか？
const hasSubCompany = crewsForUser.some(c =>
  c.company_id !== null && !primeCompanyIds.includes(c.company_id)
);

if (hasSubCompany) {
  return 'sub'; // ← 協力業者優先
}

// 2. 純粋に元請け company_id のみか？
const hasPrimeCompany = crewsForUser.some(c =>
  c.company_id !== null && primeCompanyIds.includes(c.company_id)
);

if (hasPrimeCompany) {
  return 'prime';
}

// 3. それ以外
return 'sub';
```

### 検証方法

スクリプトで確認:

```bash
node scripts/check-user-40364.js
```

出力例:

```
📋 user_id=40364 の crews レコード確認（place_id=170のみ）
検索結果: 1 件

┌─────────┬──────────┬───────────┬──────────┬──────────────┬─────────┬─────────┐
│ (index) │ crew_id  │ user_id   │ place_id │ user_level   │ company_id │ deleted │
├─────────┼──────────┼───────────┼──────────┼──────────────┼─────────┼─────────┤
│    0    │ 12345    │   40364   │   170    │      2       │   99201  │    0    │
└─────────┴──────────┴───────────┴──────────┴──────────────┴─────────┴─────────┘

🎯 ロール判定結果:
元請け会社ID: [ 98315, 203104 ]
判定: 協力業者 (sub)
  - crew_id=12345: company_id=99201, user_level=2 → 協力業者
```

---

## ポート3000とポート3001の混同

### 症状

```
ERR_CONNECTION_REFUSED
```

または、以下のエラー:

```
[stg-user-keys] Error: connect ECONNREFUSED 127.0.0.1:13306
```

### 原因

**ポート3000で起動している**ため、SSHトンネル（ポート13306）がない。

### 確認方法

```bash
# 起動中のプロセスを確認
lsof -i:3000
lsof -i:3001
lsof -i:13306
```

### 解決方法

#### 誤ったポート3000のプロセスを停止

```bash
lsof -ti:3000 | xargs kill -9
```

#### 正しいポート3001で起動

```bash
PORT=3001 npm run dev:stg
```

#### 確認

```
[tunnel] ssh -i ~/.ssh/dandoli_bastion ... -L 13306:stg-work-db.dandoli.jp:3306 ...
   ▲ Next.js 15.5.4
   - Local:        http://localhost:3001
```

---

## 環境変数が読めない問題

### 症状

```typescript
console.log(process.env.DEBUG_FIXED_USER_ID_PRIME); // undefined
```

### 原因

**クライアントサイドで環境変数を読もうとしている**が、Next.jsでは `NEXT_PUBLIC_` プレフィックスがないと読めない。

### 解決方法

`.env.local` で環境変数名を変更:

```bash
# ❌ 間違い
DEBUG_FIXED_USER_ID_PRIME=40824

# ✅ 正しい
NEXT_PUBLIC_DEBUG_FIXED_USER_ID_PRIME=40824
```

クライアントサイドで読む:

```typescript
const debugUserId = Number(process.env.NEXT_PUBLIC_DEBUG_FIXED_USER_ID_PRIME || 40824);
```

---

## useQueryBoolでWebpackエラー

### 症状

```
Error: Minified React error #321
__webpack_require__.n is not a function
```

特定のクエリパラメータ（例: `?role=sub`）でのみ発生。

### 原因

**useQueryBool フックが SSR 時に window オブジェクトにアクセス**していた。

```typescript
// ❌ 間違った実装
const [val, setVal] = useState<boolean>(() => {
  const v = sp.get(key);
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;

  // 🚨 SSR時に window にアクセス
  if (typeof window !== 'undefined') {
    const ls = localStorage.getItem(`sites.${key}`);
    // ...
  }
  return defaultVal;
})();
```

### 解決方法

**useState の初期値を defaultVal にして、useEffect 内で初期化**する。

```typescript
// ✅ 正しい実装
const [val, setVal] = useState<boolean>(defaultVal);
const [initialized, setInitialized] = useState(false);

useEffect(() => {
  if (initialized) return;

  const v = sp.get(key);
  if (v === '1' || v === 'true') {
    setVal(true);
  } else if (v === '0' || v === 'false') {
    setVal(false);
  } else if (typeof window !== 'undefined') {
    const ls = localStorage.getItem(`sites.${key}`);
    // ...
  }
  setInitialized(true);
}, [sp, key, initialized]);
```

---

## 関連ドキュメント

- **仕様書**: [docs/dw-integration-spec.md](./dw-integration-spec.md)
- **変更履歴**: [docs/changelog.md](./changelog.md)

---

**最終更新日**: 2025-11-19

---

## UI調整時の注意（v1.1.0）

- /sites 画面のUIを調整する際は、以下のポイントを守ること
  - バックエンドのフィルタリング仕様（元請け / 協力業者、「自分の現場のみ」、DW / STG フォールバック）は変更しない
  - `app/api/sites/quicklist/route.ts` のロジックには手を入れず、見た目の変更は `components/sites/views/*` と `components/sites/Toolbar.tsx` で完結させる
  - 「自分の現場のみ」トグルはフロント側の二重フィルタではなく、APIレスポンスとの整合性を優先すること
- UI調整により現場が0件表示になる場合、まずは以下を確認する
  - Dev Mode パラメータ（?role=prime/sub, only=0/1）が正しく付与されているか
  - `/api/sites/quicklist` のレスポンス `items.length` と画面上の件数が一致しているか
