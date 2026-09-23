import type { WatermarkPosition } from "./types";

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

export function rotatedBounds(size: Size, rotation: number): Size {
  const radians = rotation * Math.PI / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return { width: size.width * cos + size.height * sin, height: size.width * sin + size.height * cos };
}

export function placementPoint(canvas: Size, item: Size, position: WatermarkPosition, margin: number): Point {
  const rotated = item;
  const left = margin + rotated.width / 2;
  const right = canvas.width - margin - rotated.width / 2;
  const top = margin + rotated.height / 2;
  const bottom = canvas.height - margin - rotated.height / 2;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const x = position.includes("left") ? left : position.includes("right") ? right : centerX;
  const y = position.startsWith("top") ? top : position.startsWith("bottom") ? bottom : centerY;
  return {
    x: rotated.width >= canvas.width ? centerX : Math.min(Math.max(x, rotated.width / 2), canvas.width - rotated.width / 2),
    y: rotated.height >= canvas.height ? centerY : Math.min(Math.max(y, rotated.height / 2), canvas.height - rotated.height / 2),
  };
}

export function tilePoints(canvas: Size, bounds: Size, gapRatio: number, maxTiles = 2000): Point[] {
  const stepX = Math.max(1, bounds.width * (1 + gapRatio));
  const stepY = Math.max(1, bounds.height * (1 + gapRatio));
  const points: Point[] = [];
  for (let row = -1, y = -bounds.height; y <= canvas.height + bounds.height; row += 1, y += stepY) {
    const offset = row % 2 === 0 ? 0 : stepX / 2;
    for (let x = -bounds.width + offset; x <= canvas.width + bounds.width; x += stepX) {
      points.push({ x, y });
      if (points.length >= maxTiles) return points;
    }
  }
  return points;
}
