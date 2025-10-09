# 電子小黒板アプリ開発ログ

## プロジェクト概要
- Next.js + Supabase
- 電子小黒板の一括登録機能
- 国交省準拠（SHA-256ハッシュ、改ざん検知）
- J-COMSIA認定取得予定

## 開発状況

### Week 1（2025-10-02）✅ 完了
**実施内容：**
- Next.jsプロジェクト作成
- 12個のファイル実装完了
- Supabaseセットアップ完了
- ローカル起動成功

---

## Day 8（2025-10-08）: テンプレート管理機能と黒板プレビュー大幅改善

### 実装完了内容（すべて✅）

#### 1. テンプレート管理機能（✅完了）
- **管理画面トップ**: `app/admin/page.tsx`
  - テンプレート管理へのナビゲーション
- **テンプレート一覧**: `app/admin/templates/page.tsx`
  - テンプレート一覧表示（黒板プレビュー付き）
  - デフォルトテンプレートの青枠表示
  - 複製・編集・削除機能
  - 統計情報表示
- **テンプレート作成**: `app/admin/templates/new/page.tsx`
  - 基本情報入力（名前・説明・デフォルト設定）
  - 記載項目選択（必須項目は固定）
  - デフォルト値設定
  - デザイン設定（黒板スタイル・フォントサイズ）
  - リアルタイムプレビュー（ドラッグ&リサイズ対応）
- **テンプレート編集**: `app/admin/templates/[id]/edit/page.tsx`
  - 既存テンプレートの読み込み・編集

#### 2. テンプレートデータ管理（✅完了）
- **ファイル**: `lib/templates.ts`
- **機能**:
  - テンプレートCRUD操作
  - デフォルトテンプレート設定（複数デフォルトの自動解除）
  - 使用回数カウント
  - テンプレート複製

#### 3. 黒板プレビューコンポーネント（✅完了）
- **BlackboardPreviewBox** (`components/BlackboardPreviewBox.tsx`)
  - 工事名を全幅で表示
  - その他の項目を2列グリッドで表示
  - 項目ラベル幅を65pxに統一（中央揃え）
  - 緑/黒の黒板スタイル対応

- **DraggableBlackboard** (`components/DraggableBlackboard.tsx`)
  - ドラッグ&ドロップで位置調整
  - 右下ハンドルでサイズ変更
  - 縦横比を保持（端に達したら崩れる）
  - プレビュー画像エリアを400pxに縮小
  - コンテナからはみ出さない制限

#### 4. アップロード画面の改善（✅完了）
- **テンプレート選択UI** (`app/upload/page.tsx`)
  - テンプレート一覧表示
  - デフォルトテンプレートを自動選択
  - クリックでテンプレート切り替え
  - 選択中のテンプレートに青枠とチェックマーク
- **デフォルト値の自動入力**
  - テンプレート選択時に工種・種別・施工者などを自動入力
  - 工事名は現場名を優先

### 技術的な実装詳細

#### デフォルトテンプレート管理
```typescript
// 新規作成時
if (template.isDefault) {
  await supabase
    .from('templates')
    .update({ is_default: false })
    .eq('is_default', true);
}

// 更新時
if (updates.isDefault === true) {
  await supabase
    .from('templates')
    .update({ is_default: false })
    .eq('is_default', true)
    .neq('id', id);
}
```

#### 黒板レイアウト
- 工事名：全幅、text-sm、py-2 px-3
- その他項目：2列グリッド、text-xs、py-1.5 px-2
- ラベル幅：65px固定（flexShrink: 0）

#### ドラッグ&リサイズ
- 位置：パーセンテージで保存（x, y）
- サイズ：幅のみパーセンテージ、高さは縦横比で自動計算
- デフォルト：width 50%, position (5%, 65%)

### デザイン設定

#### デフォルト値
```typescript
{
  style: 'green',           // 黒板スタイル（green/black）
  position: { x: 5, y: 65 }, // 左下配置
  width: 50,                 // 幅50%
  height: 25,                // 高さ25%
  fontSize: 'standard',      // 標準フォント
  bgColor: '#1a5f3f',        // 緑色
  textColor: '#FFFFFF',
  opacity: 85
}
```

### バグ修正

#### 1. サイズ変更時の挙動改善
- **問題**: 右下ハンドルで拡大すると黒板が上に移動
- **解決**: 右下ハンドルの場合、位置は固定してサイズだけ変更
- **問題**: 右端や下端で拡大できない
- **解決**: 端に達したら縦横比を無視してその場で拡大

#### 2. 項目ラベルのガタガタ問題
- **問題**: ラベル幅が可変で項目が揃わない
- **解決**: width: 65px固定、text-center、flexShrink: 0

#### 3. デフォルトテンプレートの重複
- **問題**: 新規作成時に複数のデフォルトが残る
- **解決**: 新規作成・更新時に既存のデフォルトを自動解除

### ファイル構成

```
app/admin/
├── page.tsx                        # 管理画面トップ
└── templates/
    ├── page.tsx                    # テンプレート一覧
    ├── new/page.tsx                # 新規作成
    └── [id]/edit/page.tsx          # 編集

components/
├── BlackboardPreviewBox.tsx        # 黒板プレビュー（静的）
└── DraggableBlackboard.tsx         # ドラッグ&リサイズ対応

lib/
└── templates.ts                    # テンプレートCRUD
```

### 次回実装予定

#### 優先度高
- [ ] 写真に黒板を合成するプレビュー機能
- [ ] 黒板付き写真をダンドリワークAPIにアップロード
- [ ] 黒板レイアウトパターン（蔵衛門の12種類）

#### 優先度中
- [ ] テンプレートの並び替え機能
- [ ] テンプレートのカテゴリ分け
- [ ] レスポンシブ対応（スマホ表示）

### Git履歴

#### Commit 283fbc0（2025-10-08）
"feat: テンプレート管理機能とアップロード画面の大幅改善"

### 最終更新
- 日時: 2025-10-08 23:00
- 状態: Day 8完了 - テンプレート管理機能完成、アップロード画面にテンプレート選択UI追加
- コミット: 283fbc0
- 次回: 写真に黒板を合成してアップロード機能の実装

---

## Day 9（2025-10-09）: テンプレート駆動黒板システム＆ドラッグ機能実装

### 実装完了内容

#### 1. テンプレート駆動の黒板システム（✅完了）
- **BlackboardForm.tsx をテンプレート対応に全面改修**
  - `template` propsを必須化
  - テンプレートの `fields` に基づいて動的にフォーム項目を生成
  - 2カラムグリッドレイアウト実装（備考は全幅）
  - すべての項目をオプショナル化

- **BlackboardPreview.tsx のテンプレート対応強化**
  - `drawTemplateBlackboard` 関数で黒板描画
  - 工事名: 全幅表示（12%）
  - その他項目: 2列グリッド（9%）
  - 備考: 全幅表示（15%）
  - SHA-256マーク表示

- **テンプレート選択UI改善**
  - `TemplateSelector.tsx` をコンパクト化（1行表示）
  - モーダルで全テンプレート一覧表示
  - `TemplatePreviewImage.tsx` で黒板プレビュー表示

#### 2. ドラッグ&ドロップで黒板位置調整（✅完了）
- **BlackboardPreview.tsx にドラッグ機能追加**
  - マウスイベントハンドラ実装（handleMouseDown, handleMouseMove, handleMouseUp）
  - 黒板エリアのクリック判定
  - ドラッグ中のカーソル変更（cursor-grab / cursor-grabbing）
  - `onPositionChange` コールバックで位置変更を通知

- **upload/page.tsx でドラッグ位置を保存**
  - `onPositionChange` ハンドラ実装
  - デバウンス処理（500ms）でDB保存を遅延
  - リアルタイムでプレビュー更新

- **「全画面表示」ボタン追加**
  - プレビュー右上にボタン配置
  - ドラッグ機能とプレビュー機能を両立

#### 3. 黒板位置の最適化（✅完了）
- **update-template-position.js スクリプト作成**
  - テンプレート位置を x=2%, y=78% に変更（左下配置）
  - 幅35%, 高さ20%に設定
  - Supabase直接更新

#### 4. UI/UX改善（✅完了）
- **フォームレイアウト改善**
  - 工事名・撮影日時・カテゴリ: 全幅
  - その他項目: 2カラムグリッド
  - 備考: 全幅
  - スクロール量を削減

- **テンプレート選択をコンパクト化**
  - 選択中テンプレート名を1行表示
  - 「変更」ボタンでモーダル表示
  - モーダル内でテンプレートプレビュー表示

#### 5. エラー修正（✅完了）
- **UploadProgressToast の Hooks順序エラー修正**
  - 条件付きreturnの前にuseStateを配置
  - Reactのルールに準拠

- **BlackboardForm の JSX構造エラー修正**
  - 余分な closing div を削除

### 技術的な実装詳細

#### ドラッグ&ドロップ実装
```typescript
// BlackboardPreview.tsx
const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (!template || !onPositionChange) return;
  const canvas = canvasRef.current;
  if (!canvas) return;

  // マウス位置を取得（canvas座標系に変換）
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  // 黒板の範囲内かチェック
  const bbWidth = (canvas.width * template.designSettings.width) / 100;
  const bbHeight = (canvas.height * template.designSettings.height) / 100;
  const bbX = (canvas.width * template.designSettings.position.x) / 100;
  const bbY = (canvas.height * template.designSettings.position.y) / 100;

  if (mouseX >= bbX && mouseX <= bbX + bbWidth && mouseY >= bbY && mouseY <= bbY + bbHeight) {
    setIsDragging(true);
    setDragStart({ x: mouseX - bbX, y: mouseY - bbY });
  }
};

const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (!isDragging || !template || !onPositionChange) return;
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  // パーセンテージに変換
  const newX = ((mouseX - dragStart.x) / canvas.width) * 100;
  const newY = ((mouseY - dragStart.y) / canvas.height) * 100;

  onPositionChange({ x: Math.max(0, Math.min(100, newX)), y: Math.max(0, Math.min(100, newY)) });
};
```

#### デバウンス処理でDB保存
```typescript
// upload/page.tsx
const handlePositionChange = useRef<NodeJS.Timeout | null>(null);

const onPositionChange = (position: { x: number; y: number }) => {
  if (!selectedTemplate) return;

  // テンプレート位置を即座に更新（プレビュー用）
  const updatedTemplate = {
    ...selectedTemplate,
    designSettings: {
      ...selectedTemplate.designSettings,
      position
    }
  };
  setSelectedTemplate(updatedTemplate);

  // DB保存は500ms後にデバウンス
  if (handlePositionChange.current) {
    clearTimeout(handlePositionChange.current);
  }

  handlePositionChange.current = setTimeout(async () => {
    try {
      await updateTemplate(selectedTemplate.id, {
        designSettings: updatedTemplate.designSettings
      });
      console.log('✅ Template position saved:', position);
    } catch (error) {
      console.error('❌ Failed to save template position:', error);
    }
  }, 500);
};
```

#### テンプレート駆動フォーム
```typescript
// BlackboardForm.tsx
const renderField = (fieldId: string) => {
  switch (fieldId) {
    case '工種':
      return (
        <div key={fieldId}>
          <label>工種</label>
          <select value={workType} onChange={e => setWorkType(e.target.value)}>
            <option value="">工種を選択</option>
            {WORK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      );
    // ... 他のフィールド
  }
};

// 2カラムグリッドで表示
<div className="grid grid-cols-2 gap-4">
  {template.fields
    .filter(f => f !== '工事名' && f !== '撮影日' && f !== '備考')
    .map(fieldId => renderField(fieldId))}
</div>
```

### 既知の問題（保留中）

#### 1. テンプレート選択モーダルのプレビュー崩れ ⚠️
**現象**: TemplatePreviewImageの黒板レイアウトが崩れる
**問題点**:
- フィールド数に応じた高さ計算が不正確
- テキストが途切れる
- 位置がずれる

**現状**: 保留（優先度低）

### 変更ファイル一覧

#### 新規作成
- `update-template-position.js` - テンプレート位置更新スクリプト

#### 修正
- `components/BlackboardForm.tsx` - テンプレート駆動、2カラムレイアウト
- `components/BlackboardPreview.tsx` - ドラッグ&ドロップ、全画面ボタン
- `components/TemplateSelector.tsx` - コンパクト化、モーダル対応
- `components/TemplatePreviewImage.tsx` - 黒板のみプレビュー
- `components/UploadProgress.tsx` - Hooksエラー修正
- `app/upload/page.tsx` - ドラッグ位置保存、デバウンス処理
- `lib/templates.ts` - updateTemplate関数追加（importのみ）

### 次回実装予定

#### 優先度: 高
- [x] テンプレート駆動黒板システム
- [x] ドラッグ&ドロップ位置調整
- [ ] **個別設定モードのテンプレート対応** ← 次のタスク
- [ ] 写真に黒板を合成してアップロード

#### 優先度: 中
- [ ] チカチカ問題の完全解決（保留中）
- [ ] テンプレートプレビューのレイアウト修正（保留中）
- [ ] 現場写真カテゴリ連携の動作確認

### 6. パフォーマンス改善 - チカチカ問題の完全解決（✅完了）

#### 問題の原因
ドロップダウン選択時にプレビューが激しく点滅する「チカチカ」問題が発生していた。

**根本原因**:
1. `BlackboardForm.tsx`の`initialValues` useEffectが無限ループを起こしていた
   - `initialValues`オブジェクトの参照が親コンポーネントの再レンダーごとに変わる
   - `initialValues.timestamp !== timestamp`がDateオブジェクトの参照比較をしていた
   - `setTimestamp()`が発火 → フォーム変更通知 → プレビュー再描画 → 無限ループ

**解決策**:
1. `initialValues` propsを完全削除
2. テンプレートのdefaultValuesから直接state初期化
3. `key={selectedTemplate.id}`でテンプレート切り替え時に強制リマウント
4. useEffect依存配列を個別のプリミティブプロパティに分割
5. Dateオブジェクトは`getTime()`で比較
6. フォーム変更通知に50msデバウンス追加

```typescript
// BlackboardForm.tsx - 修正後
const [workType, setWorkType] = useState((template.defaultValues?.工種 as string) || '');
const [weather, setWeather] = useState((template.defaultValues?.天候 as string) || '');

// 50msデバウンスで通知
useEffect(() => {
  const timeoutId = setTimeout(() => {
    const info: BlackboardInfo = { ... };
    onFormChange?.(info);
  }, 50);
  return () => clearTimeout(timeoutId);
}, [projectName, timestamp.getTime(), workType, weather, ...]);

// initialValues useEffectを最適化
useEffect(() => {
  if (!initialValues) return;
  if (initialValues.workType !== undefined) setWorkType(initialValues.workType);
  // ...
}, [
  initialValues?.workType,
  initialValues?.weather,
  // 個別プロパティを列挙
  initialValues?.timestamp?.getTime()  // Date比較
]);
```

```typescript
// upload/page.tsx - 修正後
<BlackboardForm
  key={selectedTemplate.id}  // テンプレート変更時にリマウント
  // initialValues削除
  template={selectedTemplate}
  onFormChange={handleFormChange}
  // ...
/>
```

#### 7. ドラッグ位置更新の修正（✅完了）

**問題**: チカチカ修正後、黒板をドラッグしても位置が変わらなくなった

**原因**: `template.designSettings.position`がuseEffectの依存配列に含まれていなかった

**修正**:
```typescript
// BlackboardPreview.tsx
useEffect(() => {
  // ... canvas描画処理
}, [
  loadedImage,
  blackboardInfo.projectName,
  // ...
  template?.id,
  template?.designSettings.position.x,  // 追加
  template?.designSettings.position.y   // 追加
]);
```

#### 8. 詳細検索機能の復旧（✅完了）

**問題**: `sites/page.tsx`の詳細検索ボタンがクリックできなくなっていた

**修正**:
- `showAdvancedSearch` state追加
- onClick handlerでトグル
- フィルター機能実装（キーワード、日付範囲、担当者、役割担当者など）
- グリッドレイアウト復旧（col-span-12, col-span-6, col-span-3）

#### 9. 縦写真レイアウトの自動調整（✅完了）

**問題**: 縦長（ポートレート）写真で黒板レイアウトが崩れる

**解決**: 項目数に応じた動的高さ計算を実装

```typescript
// BlackboardPreview.tsx
// フィールド数から必要な高さを計算
const baseHeight = bbWidth * 0.12; // 工事名
const otherFields = fields.filter(f => f !== '工事名' && f !== '備考');
const rowCount = Math.ceil(otherFields.length / 2);
const gridItemHeight = bbWidth * 0.09;
const remarksHeight = fields.includes('備考') && data.備考 ? bbWidth * 0.15 : 0;
const gaps = bbWidth * 0.02 * (rowCount - 1 + (remarksHeight > 0 ? 1 : 0));

const calculatedHeight =
  bbWidth * 0.05 * 2 + // 上下余白
  baseHeight + // 工事名
  (rowCount > 0 ? bbWidth * 0.03 : 0) +
  rowCount * gridItemHeight +
  gaps +
  remarksHeight;

// designSettings.heightとcalculatedHeightの大きい方を使用
const minHeightPercent = (calculatedHeight / canvasHeight) * 100;
const heightPercent = Math.max(designSettings.height, minHeightPercent);
```

#### 10. 変数名の競合解決（✅完了）

**問題**: ビルドエラー - 複数の変数名重複
- `padding` (line 232, 284)
- `otherFields` (line 228, 342)
- `itemHeight` (line 344)
- `remarksHeight` (line 394)

**修正**:
- `padding` → `bbPadding`（1回目の使用）
- `otherFields`の重複宣言を削除（既存の変数を使用）
- `itemHeight` → `gridItemHeight`（グリッド項目用）
- `remarksHeight` → `remarksDisplayHeight`（表示用）

#### 11. ユーザー管理システム実装（✅完了）

現場データにmanager_id等のIDしかなく、名前が表示できない問題に対応。

**実装内容**:

##### データベース設計
```sql
-- supabase/migrations/20251009_create_users_table.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  level TEXT,
  permission TEXT,
  industry TEXT,
  company_id TEXT,
  company_name TEXT,
  office TEXT,
  code TEXT,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

##### API実装
- **`/api/users/import-csv`**: CSVファイルインポート（Shift-JIS対応）
- **`/api/sync/users`**: ダンドリワークAPIから同期（将来実装用）
- **`/api/dandori/users`**: ダンドリワークAPIからユーザー取得（将来実装用）

##### CSV Shift-JISエンコーディング対応
```typescript
// app/api/users/import-csv/route.ts
import * as iconv from 'iconv-lite';

const buffer = await file.arrayBuffer();
const text = iconv.decode(Buffer.from(buffer), 'Shift_JIS');
const lines = text.split('\n').filter(line => line.trim());

// CSV解析とUPSERT
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',');
  const userData = {
    user_id: values[0]?.trim(),
    name: values[1]?.trim(),
    // ...
  };
  await supabase.from('users').upsert(userData, { onConflict: 'user_id' });
}
```

##### 管理画面UI
- **`/admin/users`**: ユーザー管理画面
  - CSVアップロード機能
  - ユーザー一覧表示（検索機能付き）
  - インポート結果統計表示
- **`/admin`**: ユーザー管理メニュー追加

**同期方式**: CSV手動インポート（現在）→ AWS API自動同期（将来）

### 技術的な実装詳細

#### パフォーマンス最適化
```typescript
// 画像とキャンバスの分離で再ダウンロード防止
const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

useEffect(() => {
  if (!imageUrl) return;
  const img = new Image();
  img.onload = () => setLoadedImage(img);
  img.src = imageUrl;
}, [imageUrl]);

// useCallbackでメモ化
const handleFormChange = useCallback((info: BlackboardInfo) => {
  setPreviewBlackboardInfo(prev => ({ ...prev, ...info }));
}, []);
```

### 変更ファイル一覧

#### 新規作成
- `supabase/migrations/20251009_create_users_table.sql` - ユーザーテーブル
- `app/api/users/import-csv/route.ts` - CSV Shift-JISインポート
- `app/api/sync/users/route.ts` - API同期（将来実装）
- `app/api/dandori/users/route.ts` - APIフェッチ（将来実装）
- `app/admin/users/page.tsx` - ユーザー管理UI

#### 修正
- `components/BlackboardForm.tsx` - チカチカ修正、デバウンス、依存配列最適化
- `components/BlackboardPreview.tsx` - ドラッグ位置修正、動的高さ計算、変数名修正
- `app/upload/page.tsx` - initialValues削除、key追加、useCallback
- `app/sites/page.tsx` - 詳細検索復旧、担当者フィルター
- `app/admin/page.tsx` - ユーザー管理メニュー追加
- `package.json` - iconv-lite追加

### インストールパッケージ
```bash
npm install iconv-lite
```

### 解決した問題

#### ✅ チカチカ問題 - 完全解決
- 無限re-render loop修正
- 画像/キャンバス分離
- 50msデバウンス
- 依存配列最適化

#### ✅ ドラッグ位置更新 - 完全解決
- 依存配列にposition.x, position.y追加

#### ✅ 詳細検索 - 完全解決
- state管理復旧
- フィルター機能実装

#### ✅ 縦写真レイアウト - 完全解決
- 動的高さ計算実装
- Math.max()で最小高さ保証

#### ✅ 変数名競合 - 完全解決
- すべての重複変数を適切にリネーム

#### ✅ ユーザー管理 - 完全実装
- CSV Shift-JISインポート成功
- 58ユーザー登録確認
- 検索・一覧表示機能完成

### Git履歴

#### Commit 9239506（2025-10-09）
"feat: Day 9完了 - パフォーマンス改善とユーザー管理実装"
- チカチカ問題完全解決（無限re-render修正）
- ドラッグ位置更新修正
- 詳細検索復旧
- 縦写真レイアウト自動調整
- ユーザー管理システム実装（CSV Shift-JISインポート）

### 最終更新
- 日時: 2025-10-09
- 状態: Day 9完了 - チカチカ問題解決、ドラッグ修正、ユーザー管理実装完了
- コミット: 9239506
- 次回タスク: 黒板付き写真のアップロード機能実装

---

## 技術スタック
- Next.js 15.5.4 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Storage + Database)
- Canvas API (画像処理、黒板オーバーレイ)
- SubtleCrypto (SHA-256ハッシュ計算)

## アーキテクチャ
```
ユーザー
  ↓
Next.jsアプリ
  ├─ フロント: 写真選択、テンプレート選択、黒板情報入力
  ├─ 画像処理: Canvas API（黒板オーバーレイ、EXIF削除、SHA-256）
  ├─ BFF: Bearer Token秘匿
  └─ manifest.json保存: Supabase Storage
  ↓
ダンドリワークAPI
  └─ 写真アップロード（10枚チャンク × 並列3）
```

## データベーススキーマ（Supabase）

### templates テーブル
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  fields TEXT[] NOT NULL,
  default_values JSONB DEFAULT '{}',
  design_settings JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 環境変数（.env.local）
```bash
# ダンドリワークAPI
NEXT_PUBLIC_DW_API_BASE=https://api.dandoli.jp/api
DW_BEARER_TOKEN=（設定済み）
NEXT_PUBLIC_PLACE_CODE=dandoli-sample1

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jtdgyaldlleueflutjop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（設定済み）
SUPABASE_SERVICE_ROLE_KEY=（設定済み）
```

## 開発メモ
- ポート: 3001で起動
- 現場一覧: http://localhost:3001/sites
- アップロード: http://localhost:3001/upload?site_code=127083&place_code=dandoli-sample1
- 管理画面: http://localhost:3001/admin
- テンプレート管理: http://localhost:3001/admin/templates

## トラブルシューティング

### テンプレートが表示されない
- Supabaseのtemplatesテーブルを確認
- デフォルトテンプレートを作成してテスト

### ドラッグ&リサイズが動かない
- useEffectの依存配列を確認
- position/sizeのstateが正しく更新されているか確認

## 今後の開発予定
- [ ] 黒板レイアウトパターン実装（12種類）
- [ ] 写真アップロード機能の完成
- [ ] 実環境テスト
- [ ] J-COMSIA認定申請
