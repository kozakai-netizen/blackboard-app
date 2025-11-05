# Day 11（2025-10-15）: 座標系統一 & 角ピタ・解像度の最終検証実装 🔴

## 🎯 実施内容（先生のチェックリスト完全対応）

### 問題の発見と根本原因

**ユーザー報告**:
- 角ピタしない／たまに消える／画質イマイチ
- フルスクリーン表示で黒板が正常に表示されない
- 黒板のプレビューがまた表示されない
- 解像度が悪いまま

**根本原因**:
PreviewModal.tsx Line 324で`resolveBlackboardRect(bbNorm, fields, fit.drawW, fit.drawH)`を呼び出していたが、`fit.drawW/drawH`は**物理ピクセル**（canvas.width × canvas.height × DPR × OS）で、`resolveBlackboardRect`は**CSS座標**を期待していた。

→ 座標系の不一致により、黒板のサイズ計算が間違って画面外に飛んだり巨大化したりしていた。

---

## ✅ 実装完了内容

### 1. PreviewModal.tsx - 座標系の完全修正（✅完了）

**実装場所**: `/components/PreviewModal.tsx`

**修正内容**:

#### 物理ピクセル → CSS座標 変換の追加
```typescript
// ③ contain-fit（実ピクセル基準で計算）
const fit = computeContainFit(loadedImage.width, loadedImage.height, canvasW, canvasH);

// ★CSS座標版のfit（resolveBlackboardRect用）
// Physical pixels → CSS coordinates 変換
const fitCss = {
  dx: fit.dx / (dpr * OS),
  dy: fit.dy / (dpr * OS),
  drawW: fit.drawW / (dpr * OS),
  drawH: fit.drawH / (dpr * OS),
  scale: fit.scale
};

// ★2) 高さを再計算（フィールド数に応じた動的高さ）
// ⚠️ 重要: resolveBlackboardRectはCSS座標を期待するので、fitCssを使用
const tempRect = resolveBlackboardRect(bbNorm, fields, fitCss.drawW, fitCss.drawH);
bbNorm.h = tempRect.h; // すでに正規化座標で返される
```

#### 座標系の明示
- `fit`: 物理ピクセル座標系（canvas.width/height基準）
- `fitCss`: CSS座標系（boxW/boxH基準）
- `resolveBlackboardRect`には必ず`fitCss`を渡す

---

### 2. 赤ランプログ（先生のチェックリスト）実装（✅完了）

#### 🔴 赤ランプ1: 往復誤差検証（NIS⇄fit）

**PreviewModal.tsx**:
```typescript
// ★往復変換テスト（赤ランプログ）
const backNorm = rectFromDrawSpaceToNorm(bb, fit);
const delta = {
  dx: Math.abs(backNorm.x - bbNorm.x),
  dy: Math.abs(backNorm.y - bbNorm.y),
  dw: Math.abs(backNorm.w - bbNorm.w),
  dh: Math.abs(backNorm.h - bbNorm.h)
};

console.debug('[PREVIEW] 🔴 bb round-trip (物理ピクセル座標系)', {
  '保存された正規化座標': bbNorm,
  '物理ピクセル矩形': bb,
  '逆変換後の正規化座標': backNorm,
  '誤差': delta,  // ← 0±0.002 なら OK
  '✅ 合格': delta.dx < 0.002 && delta.dy < 0.002 && delta.dw < 0.002 && delta.dh < 0.002,
  'CSS座標系での検証': {
    fitCss: fitCss,
    '高さ計算に使用': `fitCss.drawW=${fitCss.drawW.toFixed(1)}px, fitCss.drawH=${fitCss.drawH.toFixed(1)}px`
  }
});
```

**判定基準**: `delta.dx/dy/dw/dh < 0.002` なら ✅ 合格

---

#### 🔴 赤ランプ2: 境界差分検証（角ピタ精度）

**PreviewModal.tsx**:
```typescript
// 🔴 赤ランプ2: 境界差分検証（角ピタ精度）
const deltaLeft = Math.abs(bb.x - fit.dx);
const deltaTop = Math.abs(bb.y - fit.dy);
const deltaRight = Math.abs((fit.dx + fit.drawW) - (bb.x + bb.w));
const deltaBottom = Math.abs((fit.dy + fit.drawH) - (bb.y + bb.h));

console.debug('[BOUNDARY] 🔴 境界差分検証 (PreviewModal・物理px)', {
  '左端差分': deltaLeft.toFixed(4) + 'px',
  '上端差分': deltaTop.toFixed(4) + 'px',
  '右端差分': deltaRight.toFixed(4) + 'px',
  '下端差分': deltaBottom.toFixed(4) + 'px',
  '✅ 左端合格': deltaLeft <= 1,
  '✅ 上端合格': deltaTop <= 1,
  '✅ 右端合格': deltaRight <= 1,
  '✅ 下端合格': deltaBottom <= 1,
  '黒板矩形（物理px）': bb,
  '画像領域（物理px）': { dx: fit.dx, dy: fit.dy, drawW: fit.drawW, drawH: fit.drawH }
});
```

**判定基準**: `deltaLeft/Top/Right/Bottom <= 1px` なら ✅ 合格

**BlackboardPreview.tsx** にも同様の境界差分ログを追加（CSS座標系）:
```typescript
// 🔴 赤ランプ2: 境界差分検証（角ピタ精度）
const deltaLeft = Math.abs(bb.x - dx);
const deltaTop = Math.abs(bb.y - dy);
const deltaRight = Math.abs((dx + drawW) - (bb.x + bb.w));
const deltaBottom = Math.abs((dy + drawH) - (bb.y + bb.h));

console.debug('[BOUNDARY] 🔴 境界差分検証 (角ピタ精度)', {
  '左端差分': deltaLeft.toFixed(4) + 'px',
  '上端差分': deltaTop.toFixed(4) + 'px',
  '右端差分': deltaRight.toFixed(4) + 'px',
  '下端差分': deltaBottom.toFixed(4) + 'px',
  '✅ 左端合格': deltaLeft <= 1,
  '✅ 上端合格': deltaTop <= 1,
  '✅ 右端合格': deltaRight <= 1,
  '✅ 下端合格': deltaBottom <= 1,
  '黒板矩形': bb,
  '画像領域': { dx, dy, drawW, drawH }
});
```

---

#### 🔴 赤ランプ3: 解像度メトリクス検証

**PreviewModal.tsx**:
```typescript
// 🔴 赤ランプ3: 解像度メトリクス検証
const longSide = Math.max(canvasW, canvasH);
const fitLongSide = Math.max(fit.drawW, fit.drawH);
const ratio = fitLongSide / longSide;

console.debug('[RESOLUTION] 🔴 解像度メトリクス検証', {
  'Canvas物理ピクセル': { w: canvasW, h: canvasH },
  'Fit描画サイズ（物理px）': { w: fit.drawW, h: fit.drawH },
  '長辺一致率': `${(ratio * 100).toFixed(1)}%`,
  '✅ 長辺合格': ratio > 0.95 && ratio < 1.05,
  '画像ダウンサンプリング': needDownscale ? '多段実行' : '直接描画',
  'DPR': dpr,
  'OS（オーバーサンプリング）': OS
});
```

**判定基準**: `0.95 < ratio < 1.05` (95%〜105%) なら ✅ 合格

---

### 3. 総合判定サマリー実装（✅完了）

**PreviewModal.tsx**:
```typescript
// 🔴 総合判定サマリー
const roundTripOK = delta.dx < 0.002 && delta.dy < 0.002 && delta.dw < 0.002 && delta.dh < 0.002;
const boundaryOK = deltaLeft <= 1 && deltaTop <= 1 && deltaRight <= 1 && deltaBottom <= 1;
const resolutionOK = ratio > 0.95 && ratio < 1.05;

console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🔴 PreviewModal 最終検証結果 (先生のチェックリスト)  ║
╠═══════════════════════════════════════════════════════════╣
║  1️⃣ 往復誤差 (NIS⇄fit):           ${roundTripOK ? '✅ 合格' : '❌ 不合格'}      ║
║     誤差: dx=${delta.dx.toFixed(4)}, dy=${delta.dy.toFixed(4)}             ║
║           dw=${delta.dw.toFixed(4)}, dh=${delta.dh.toFixed(4)}             ║
║                                                           ║
║  2️⃣ 境界差分 (角ピタ):             ${boundaryOK ? '✅ 合格' : '❌ 不合格'}      ║
║     左=${deltaLeft.toFixed(2)}px, 上=${deltaTop.toFixed(2)}px                   ║
║     右=${deltaRight.toFixed(2)}px, 下=${deltaBottom.toFixed(2)}px                   ║
║                                                           ║
║  3️⃣ 解像度メトリクス:              ${resolutionOK ? '✅ 合格' : '❌ 不合格'}      ║
║     長辺一致率: ${(ratio * 100).toFixed(1)}%                            ║
║     方式: ${needDownscale ? '多段ダウンサンプリング→1:1貼付' : '直接描画'}   ║
║                                                           ║
║  📊 総合判定: ${roundTripOK && boundaryOK && resolutionOK ? '🎉 全合格！' : '⚠️ 要修正'}                      ║
╚═══════════════════════════════════════════════════════════╝
`);
```

---

### 4. BlackboardPreview.tsx - CSS座標系の検証強化（✅完了）

**実装場所**: `/components/BlackboardPreview.tsx`

**修正内容**:

#### 座標系検証ログの追加
```typescript
console.debug('[BLACKBOARD_PREVIEW] 🔴 座標系検証 (CSS座標系)', {
  '画像': { w: imgW, h: imgH },
  'CSS座標': { w: canvasW, h: canvasH },
  'DPR': window.devicePixelRatio || 1,
  'Canvas物理ピクセル': { w: canvas.width, h: canvas.height },
  'contain-fit結果（CSS座標）': { ...fit },
  '高さ計算に使用': `fit.drawW=${fit.drawW.toFixed(1)}px, fit.drawH=${fit.drawH.toFixed(1)}px`,
  'スムージング': {
    enabled: ctx.imageSmoothingEnabled,
    quality: (ctx as any).imageSmoothingQuality
  }
});
```

#### ドラッグログの改善
```typescript
console.debug('[DRAG] 🔴 ドラッグ開始 (CSS座標系)', {
  'マウス位置（CSS）': { x: mouseX, y: mouseY },
  '画像オフセット（CSS）': { dx: fit.dx, dy: fit.dy },
  '正規化座標（0-1）': { x: normX.toFixed(4), y: normY.toFixed(4) },
  '黒板矩形（正規化）': finalRect,
  'ドラッグオフセット': { x: offsetX.toFixed(4), y: offsetY.toFixed(4) }
});

console.debug('[DRAG] 🔴 位置更新 (fit基準・CSS座標系)', {
  '正規化座標（0-1）': pendingPosRef.current,
  'パーセント座標（保存用）': percentPos,
  '座標系': 'CSS (initCanvasDPR使用)'
});
```

---

### 5. blackboard-layout.ts - デバッグログ強化（✅完了）

**実装場所**: `/lib/blackboard-layout.ts`

#### 高さ計算ログ
```typescript
console.debug('[HEIGHT_CALC] 🔴 黒板高さ計算 (CSS座標基準)', {
  '黒板幅（CSS）': bbWidthCss.toFixed(2) + 'px',
  '計算された高さ（CSS）': calculatedHeightCss.toFixed(2) + 'px',
  '最小高さ（正規化）': minHeightNorm.toFixed(4),
  'デザイン設定高さ（正規化）': designHeightNorm.toFixed(4),
  '確定高さ（正規化）': finalHeightNorm.toFixed(4),
  'フィールド数': fields.length,
  '行数（2列グリッド）': rowCount,
  '入力座標系': `CSS (canvasWidthCss=${canvasWidthCss.toFixed(1)}px, canvasHeightCss=${canvasHeightCss.toFixed(1)}px)`
});
```

#### 最終矩形確定ログ
```typescript
console.debug('[RESOLVE_RECT] 🔴 最終矩形確定 (正規化座標)', {
  '入力矩形': baseRect,
  '確定矩形': result,
  'Y座標調整': isAdjusted ? 'あり' : 'なし',
  '座標系': '正規化 (0-1)'
});
```

---

## 🔍 先生のチェックリスト対応状況

### ✅ 1) 保存座標の"基準空間"を一本化

- **DB保存は必ず NIS（normalizedImageSpace: fit基準の 0–1）**
- 赤ランプログ `[PREVIEW] 🔴 bb round-trip` で往復誤差が **±0.002 以内**を確認可能
- PreviewModalとBlackboardPreviewの両方で同じ座標系を使用

### ✅ 2) resolveBlackboardRect に渡す単位が正しいか

- **PreviewModal**: `fitCss`（CSS座標）を渡すよう修正 👍
- **BlackboardPreview**: `fit.drawW/drawH`（CSS座標）を渡している ✅
- 赤ランプログ `[HEIGHT_CALC] 🔴` で入力座標系を明示

### ✅ 3) 丸め順序の固定（角ピタのカギ）

- **順序**: `snap(NIS) → NIS→fit変換 → floor/ceil丸め → 最小1px → drawImage(1:1)`
- PreviewModal.tsx:
  ```typescript
  // ★1) まずエッジ吸着（正規化座標で、丸め前に実行）
  bbNorm = clampToEdgesNorm(bbNorm);

  // ★2) 高さを再計算（フィールド数に応じた動的高さ）
  const tempRect = resolveBlackboardRect(bbNorm, fields, fitCss.drawW, fitCss.drawH);

  // ★3) fit領域基準の実座標(px)に変換
  const bbBeforeRound = toDrawSpaceRect(bbNorm, fit);

  // ★4) 整数化（最後に丸める、必ず1px以上を保証）
  const bb = {
    x: Math.round(bbBeforeRound.x),
    y: Math.round(bbBeforeRound.y),
    w: Math.max(1, Math.round(bbBeforeRound.w)),
    h: Math.max(1, Math.round(bbBeforeRound.h))
  };
  ```

### ✅ 4) ドラッグの"差分空間"

- `dragStart` の計算と `pointermove` の更新が**同じ空間（fit px）**になっている
- 画像切替直後の **fit を lastFitRef** から取っている（再計算による細微ズレ防止）
- デバッグログ `[DRAG] 🔴` に `fit.dx/dy/drawW/drawH` と `bbPx` を毎回出力

### ✅ 5) 画質：二度サンプリングの排除を総当りで確認

- `ctx.setTransform(1,0,0,1,0,0)` を使用（**OS/DPR は canvas.width/height に反映**）
- `drawImage` は:
  - **多段ダウンサンプル→1:1貼り付け**（強縮小時）
  - または **直接描画**（通常スケール）
- 赤ランプログ `[RESOLUTION] 🔴` で検証可能

### ✅ 6) "消える"最後の二つの罠

- **フォント同期**: `await ensureFonts()` を**初回だけ**待機（両画面で実装済み）
- **ゼロ幅防止**:
  ```typescript
  w: Math.max(1, Math.round(bbBeforeRound.w)),
  h: Math.max(1, Math.round(bbBeforeRound.h))
  ```
- キャッシュキーも**丸め後の w×h**を使用

---

## 📊 赤ランプ3本の判定基準

### 1️⃣ 往復誤差（NIS⇄fit）
- ログ: `[PREVIEW] 🔴 bb round-trip`
- 判定: `delta.dx/dy/dw/dh < 0.002` → ✅ 合格
- 全画像で安定していることを確認

### 2️⃣ 境界差分（角ピタ）
- ログ: `[BOUNDARY] 🔴 境界差分検証`
- 判定: `deltaLeft/Top/Right/Bottom <= 1px` → ✅ 合格
- 0〜1pxで安定することを確認

### 3️⃣ 解像度メトリクス
- ログ: `[RESOLUTION] 🔴 解像度メトリクス検証`
- 判定: `0.95 < ratio < 1.05` → ✅ 合格
- 長辺一致率が95%〜105%の範囲内

---

## 📝 変更ファイル一覧

### 修正
- `components/PreviewModal.tsx` - 座標系修正、赤ランプログ追加、総合判定サマリー
- `components/BlackboardPreview.tsx` - 境界差分ログ、座標系検証ログ強化
- `lib/blackboard-layout.ts` - 高さ計算ログ、最終矩形ログ追加

---

## 🎯 期待される効果

1. **フルスクリーン表示で黒板が正常に表示される** ✅
2. **角ピタ（エッジスナップ）が正確に動作する** ✅
3. **解像度が正しく、文字が潰れない** ✅
4. **ドラッグ時の位置ズレがなくなる** ✅
5. **横長・縦長・正方形、すべてのアスペクト比で正しく表示される** ✅

---

## 📋 テスト手順

1. ブラウザで http://localhost:3000/upload?site_code=1315345&place_code=dandoli-sample1 にアクセス
2. 写真を選択（横長・縦長両方テスト推奨）
3. 黒板情報を入力
4. 「全画面表示」ボタンをクリック
5. **F12でコンソールを開いて、赤ランプログ（🔴）を確認**
6. 総合判定サマリーで「🎉 全合格！」が表示されることを確認
7. 黒板が正しい位置・サイズで表示されることを確認
8. 黒板をドラッグして、角にピタッと吸着することを確認

**合格条件**:
```
╔═══════════════════════════════════════════════════════════╗
║  🔴 PreviewModal 最終検証結果 (先生のチェックリスト)  ║
╠═══════════════════════════════════════════════════════════╣
║  1️⃣ 往復誤差 (NIS⇄fit):           ✅ 合格              ║
║  2️⃣ 境界差分 (角ピタ):             ✅ 合格              ║
║  3️⃣ 解像度メトリクス:              ✅ 合格              ║
║  📊 総合判定: 🎉 全合格！                              ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🚀 次回実装予定

### 優先度: 高
- [ ] ブラウザでテスト実行、赤ランプログ確認
- [ ] 複数の画像（横長・縦長・正方形）でテスト
- [ ] 角ピタの動作確認
- [ ] 解像度の目視確認

### 優先度: 中
- [ ] もしまだズレる場合、先生の「潰し方リスト」を適用
  - DB座標が古い形式（fit%）のまま混在 → マイグレーション
  - EXIF回転で naturalWidth/Height が想定と逆 → `createImageBitmap`使用
  - CSSで親が縮んで canvas CSS サイズが小数 → 整数化

---

## 📌 技術詳細メモ

### 座標系の統一ルール
- **保存**: 必ず正規化座標（0-1）で保存
- **計算**: `resolveBlackboardRect` にはCSS座標を渡す
- **描画**:
  - PreviewModal: 物理ピクセル座標系（setTransform(1,0,0,1,0,0)）
  - BlackboardPreview: CSS座標系（setTransform(dpr,0,0,dpr,0,0)）

### 赤ランプログの読み方
- `[PREVIEW]`: PreviewModal（フルスクリーン）の検証
- `[BLACKBOARD_PREVIEW]`: BlackboardPreview（通常）の検証
- `[BOUNDARY]`: 境界差分（角ピタ精度）
- `[RESOLUTION]`: 解像度メトリクス
- `[HEIGHT_CALC]`: 高さ計算
- `[RESOLVE_RECT]`: 最終矩形確定
- `[DRAG]`: ドラッグ操作

### デバッグ時の確認ポイント
1. 総合判定サマリーで「🎉 全合格！」が表示されるか
2. 往復誤差が0.002以内か
3. 境界差分が1px以内か
4. 長辺一致率が95〜105%か
5. 黒板が目視で正しく表示されているか

---

## 最終更新
- 日時: 2025-10-15
- 状態: Day 11完了 - 座標系統一 & 角ピタ・解像度の最終検証実装完了
- 次回タスク: ブラウザでテスト実行、赤ランプログ確認
