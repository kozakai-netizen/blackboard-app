// app/stg/remarks-test/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { drawRemarks } from "@/lib/canvas/drawRemarks";

type Row = { id: number; title?: string; remarks?: string; updated_at?: string };

export default function Page() {
  const [row, setRow] = useState<Row | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    fetch("/api/stg-blackboards", { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: Row[]) => setRow(rows?.[0] ?? null))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!row || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // デモ用に単色背景
    const W = 900;
    const H = 600;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);

    // 黒板領域（デモ）
    const innerX = Math.round(W * 0.05);
    const innerY = Math.round(H * 0.10);
    const innerW = Math.round(W * 0.90);
    const innerH = Math.round(H * 0.80);

    ctx.strokeStyle = "#999";
    ctx.strokeRect(innerX, innerY, innerW, innerH);

    // 備考ボックス
    const box = {
      x: innerX + innerW * 0.03,
      y: innerY + innerH * 0.67,
      w: innerW * 0.94,
      h: innerH * 0.28,
    };

    drawRemarks(ctx, row.remarks ?? "", box, {
      maxLines: 2,
      font: `${Math.round(innerH * 0.04)}px sans-serif`,
      lineHeight: Math.round(innerH * 0.045),
      overflowRatio: 0.05,
      debug: true,
      color: "#000",
    });
  }, [row]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">STG備考・描画テスト</h1>
      <p className="text-sm text-gray-600">最新1件のremarksをCanvasに描画します（赤枠はデバッグ）。</p>
      {!row ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="text-sm">ID: {row.id} / updated_at: {row.updated_at}</div>
          <div className="text-sm">remarks: {row.remarks || "(empty)"}</div>
          <canvas ref={canvasRef} className="border rounded" />
        </>
      )}
    </div>
  );
}
