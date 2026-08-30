"use client";

import { useEffect, useRef } from "react";

// Dark to light. The mark is drawn once, then only the character choice changes per frame.
const RAMP = " .:-=+*#%@";
const CELL = 7;
const CELL_ASPECT = 0.55;

export function AsciiLogo({ size = 320 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const cols = Math.floor(size / (CELL * CELL_ASPECT));
    const rows = Math.floor(size / CELL);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let coverage: number[] = [];
    let frame = 0;
    let raf = 0;

    const paint = () => {
      const color = getComputedStyle(canvas).color;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = color;
      ctx.font = `${CELL}px var(--font-geist-mono), monospace`;
      ctx.textBaseline = "top";
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const a = coverage[y * cols + x];
          if (a <= 0.02) continue;
          // A slow diagonal wave walks the ramp, so the mark reads as a live signal.
          const wave = reduced ? 0 : Math.sin((x + y) * 0.25 - frame * 0.05) * 0.18;
          const i = Math.min(RAMP.length - 1, Math.max(1, Math.round((a + wave) * (RAMP.length - 1))));
          ctx.fillText(RAMP[i], x * CELL * CELL_ASPECT, y * CELL);
        }
      }
    };

    const loop = () => {
      frame += 1;
      paint();
      raf = window.requestAnimationFrame(loop);
    };

    const img = new window.Image();
    img.onload = () => {
      // Sample the mark once at one pixel per character cell, alpha is the coverage.
      const sampler = document.createElement("canvas");
      sampler.width = cols;
      sampler.height = rows;
      const sctx = sampler.getContext("2d");
      if (!sctx) return;
      sctx.drawImage(img, 0, 0, cols, rows);
      const { data } = sctx.getImageData(0, 0, cols, rows);
      coverage = Array.from({ length: cols * rows }, (_, i) => data[i * 4 + 3] / 255);
      if (reduced) paint();
      else loop();
    };
    img.src = "/logo-outline.svg";

    return () => window.cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="text-foreground"
    />
  );
}
