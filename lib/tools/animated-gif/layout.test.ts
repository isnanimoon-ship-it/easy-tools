import { describe, expect, it } from "vitest";
import { clampGifDimension, fitFrame, normalizeFrameDelay } from "./layout";

describe("animated GIF layout", () => {
  it("contains a landscape image without cropping", () => {
    expect(fitFrame(200, 100, 100, 100, "contain")).toEqual({ x: 0, y: 25, width: 100, height: 50 });
  });

  it("covers a square canvas from the center", () => {
    expect(fitFrame(200, 100, 100, 100, "cover")).toEqual({ x: -50, y: 0, width: 200, height: 100 });
  });

  it("clamps dimensions and GIF delays", () => {
    expect(clampGifDimension(2000)).toBe(1600);
    expect(clampGifDimension(0)).toBe(1);
    expect(normalizeFrameDelay(17)).toBe(20);
    expect(normalizeFrameDelay(556)).toBe(560);
  });
});

