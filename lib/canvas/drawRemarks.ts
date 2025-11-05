// lib/canvas/drawRemarks.ts
export type DrawTextBox = { x: number; y: number; w: number; h: number };

export function drawRemarks(
  ctx: CanvasRenderingContext2D,
  remarks: string | null | undefined,
  box: DrawTextBox,
  options?: {
    maxLines?: number;
    font?: string;
    lineHeight?: number;
    overflowRatio?: number;
    debug?: boolean;
    color?: string;
  }
) {
  if (!remarks) return;

  const {
    maxLines = 2,
    font = "16px sans-serif",
    lineHeight = 18,
    overflowRatio = 0.05,
    debug = false,
    color = "#000",
  } = options || {};

  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";

  const words = remarks.split(/(\s+)/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current + word;
    const w = ctx.measureText(test).width;
    if (w > box.w && current !== "") {
      lines.push(current.trim());
      current = word.trim();
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (lines.length < maxLines && current) lines.push(current.trim());

  const contentH = lines.length * lineHeight;
  const allowedOverflow = box.h * overflowRatio;
  const bottom = box.y + box.h;

  let y = box.y;
  if (y + contentH <= bottom + allowedOverflow) {
    for (const line of lines) {
      ctx.fillText(line, box.x, y);
      y += lineHeight;
    }
  } else {
    const ellipsis = "…";
    let text = remarks;
    while (ctx.measureText(text + ellipsis).width > box.w && text.length > 0) {
      text = text.slice(0, -1);
    }
    ctx.fillText(text + ellipsis, box.x, box.y);
    if (debug) console.warn("[REMARKS_TRUNCATED]", { text: remarks });
  }

  if (debug) {
    ctx.strokeStyle = "rgba(255,0,0,0.3)";
    ctx.strokeRect(box.x, box.y, box.w, box.h);
  }

  ctx.restore();
}
