import { describe, expect, it } from "vitest";
import { pageGeometry } from "./pdf";

describe("image to PDF page placement", () => {
  it("fits portrait and landscape images without cropping", () => {
    for (const [w, h] of [[1000, 1500], [1500, 1000]]) {
      const g = pageGeometry("a4", "portrait", "normal", w, h);
      expect(g.drawWidth / g.drawHeight).toBeCloseTo(w / h);
      expect(g.x).toBeGreaterThanOrEqual(28);
      expect(g.y).toBeGreaterThanOrEqual(28);
      expect(g.x + g.drawWidth).toBeLessThan(g.width - 28);
      expect(g.y + g.drawHeight).toBeLessThan(g.height - 28);
    }
  });
  it("uses the requested sheet orientation and margin", () => {
    const portrait = pageGeometry("letter", "portrait", "none", 100, 100);
    const landscape = pageGeometry("letter", "landscape", "normal", 100, 100);
    expect([portrait.width, portrait.height]).toEqual([612, 792]);
    expect([landscape.width, landscape.height]).toEqual([792, 612]);
    expect(portrait.drawWidth).toBe(612);
    expect(landscape.drawWidth).toBeLessThan(612);
  });
});
