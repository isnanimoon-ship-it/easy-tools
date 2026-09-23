import { describe, expect, it } from "vitest";
import { placementPoint, rotatedBounds, tilePoints } from "./layout";

describe("image watermark layout", () => {
  it("calculates rotated bounds", () => {
    expect(rotatedBounds({ width: 100, height: 40 }, 0)).toEqual({ width: 100, height: 40 });
    const ninety = rotatedBounds({ width: 100, height: 40 }, 90);
    expect(ninety.width).toBeCloseTo(40);
    expect(ninety.height).toBeCloseTo(100);
  });
  it("places all corner and center presets inside the canvas", () => {
    const canvas = { width: 1000, height: 600 }, item = { width: 200, height: 80 };
    expect(placementPoint(canvas, item, "top-left", 30)).toEqual({ x: 130, y: 70 });
    expect(placementPoint(canvas, item, "center", 30)).toEqual({ x: 500, y: 300 });
    expect(placementPoint(canvas, item, "bottom-right", 30)).toEqual({ x: 870, y: 530 });
  });
  it("clamps oversized items to a safe center", () => {
    const point = placementPoint({ width: 100, height: 100 }, { width: 200, height: 200 }, "bottom-right", 20);
    expect(point).toEqual({ x: 50, y: 50 });
  });
  it("creates staggered tiles and respects the cap", () => {
    const points = tilePoints({ width: 1200, height: 800 }, { width: 80, height: 30 }, 0.5, 25);
    expect(points).toHaveLength(25);
    expect(points[0].x).not.toBe(points[1].x);
  });
});
