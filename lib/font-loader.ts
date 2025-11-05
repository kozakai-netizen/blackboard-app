// lib/font-loader.ts
// フォント読み込み完了を待つユーティリティ

let fontsReady = false;

/**
 * フォント読み込みを確実に待つ（初回のみ）
 * 文字の潰れ/跳ね返りを防止
 */
export async function ensureFonts(): Promise<void> {
  if (!fontsReady && 'fonts' in document) {
    try {
      await (document as any).fonts.ready;
      fontsReady = true;
      console.debug('Fonts loaded and ready');
    } catch (error) {
      console.warn('Font loading failed, continuing anyway:', error);
      fontsReady = true; // エラーでも次回は待たない
    }
  }
}
