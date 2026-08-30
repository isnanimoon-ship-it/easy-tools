"use client";

import { useEffect, useRef } from "react";
import { renderFavicon } from "@/lib/tools/favicon-generator/render";
import type { FaviconSpec } from "@/lib/tools/favicon-generator/types";

type FaviconCanvasProps = {
  spec: FaviconSpec;
  size: number;
  displaySize?: number;
  className?: string;
  onPointerDown?: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp?: (event: React.PointerEvent<HTMLCanvasElement>) => void;
};

export function FaviconCanvas({
  spec,
  size,
  displaySize,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: FaviconCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderFavicon(ctx, spec, size);
  }, [spec, size]);

  const cssSize = displaySize ?? size;
  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: cssSize, height: cssSize }}
      className={className}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
