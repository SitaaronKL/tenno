"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const RAMP = " .:-=+*#%@";
const CELL_ASPECT = 0.55;

// Big text spun around its vertical axis and redrawn as characters, the same ramp as the logo.
export function AsciiText({
  text,
  width = 640,
  height = 260,
  cell = 8,
  // Seconds per full turn.
  period = 6,
  className,
}: {
  text: string;
  width?: number;
  height?: number;
  cell?: number;
  period?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const cols = Math.floor(width / (cell * CELL_ASPECT));
    const rows = Math.floor(height / cell);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const sampler = document.createElement("canvas");
    sampler.width = cols;
    sampler.height = rows;
    const sctx = sampler.getContext("2d");
    if (!sctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now();

    const paint = (now: number) => {
      const t = reduced ? 0 : ((now - start) / 1000 / period) * Math.PI * 2;
      // cos gives the coin flip, the sign keeps the glyphs readable on the way back around.
      const sx = Math.cos(t);
      sctx.clearRect(0, 0, cols, rows);
      sctx.save();
      sctx.translate(cols / 2, rows / 2);
      sctx.scale(Math.max(Math.abs(sx), 0.04) * (sx < 0 ? -1 : 1), 1);
      sctx.fillStyle = "#fff";
      // Canvas fonts cannot read CSS variables, so name the face directly and size it to the width.
      sctx.font = `bold ${rows}px "Instrument Serif", Georgia, serif`;
      const fit = (cols * 0.9) / Math.max(1, sctx.measureText(text).width);
      sctx.font = `bold ${Math.floor(rows * Math.min(fit, 1.15))}px "Instrument Serif", Georgia, serif`;
      sctx.textAlign = "center";
      sctx.textBaseline = "middle";
      sctx.fillText(text, 0, rows * 0.04);
      sctx.restore();
      const { data } = sctx.getImageData(0, 0, cols, rows);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = getComputedStyle(canvas).color;
      ctx.font = `${cell}px var(--font-geist-mono), monospace`;
      ctx.textBaseline = "top";
      // Thinner when edge on, so the spin reads as depth and not as a squash.
      const depth = 0.55 + Math.abs(sx) * 0.45;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const a = (data[(y * cols + x) * 4 + 3] / 255) * depth;
          if (a <= 0.03) continue;
          const i = Math.min(RAMP.length - 1, Math.max(1, Math.round(a * (RAMP.length - 1))));
          ctx.fillText(RAMP[i], x * cell * CELL_ASPECT, y * cell);
        }
      }
      if (!reduced) raf = window.requestAnimationFrame(paint);
    };

    raf = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(raf);
  }, [text, width, height, cell, period]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={text}
      style={{ width, height, maxWidth: "100%" }}
      className={cn("text-foreground", className)}
    />
  );
}
