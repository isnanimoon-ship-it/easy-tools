import { describe, expect, it } from "vitest";
import {
  aspectPenalty,
  colorDriftScore,
  detectStatusBar,
  edgeAsymmetryScore,
  heightPriorScore,
  referenceColor,
} from "./detection";
import {
  clampCropHeight,
  clientYToImageY,
  maxCropHeightFor,
} from "./geometry";
import {
  canAutoDetect,
  isLandscape,
  isTooSmallToDetect,
  validDimensions,
  validateFile,
} from "./validation";
import type { PixelBuffer } from "./types";

function makeStrip(width: number, height: number, gray: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    data[i + 3] = 255;
  }
  return { data, width, height };
}
function fillRect(
  strip: PixelBuffer,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  gray: number,
) {
  for (let y = y0; y < y1 && y < strip.height; y++)
    for (let x = x0; x < x1 && x < strip.width; x++) {
      const i = (y * strip.width + x) * 4;
      strip.data[i] = gray;
      strip.data[i + 1] = gray;
      strip.data[i + 2] = gray;
    }
}
function paintIconMarks(
  strip: PixelBuffer,
  y0: number,
  y1: number,
  mark: number,
) {
  // A denser cluster of stripes than a real status bar's icons would ever be
  // sparser than — this matters because `colorDriftScore` deliberately looks
  // at the whole row's *median* color (icon-robust by design), so evidence
  // for an icons-only boundary (no real background color change) has to come
  // entirely from `edgeAsymmetryScore`. A too-sparse fixture undershoots the
  // evidence floor and silently fails to test anything meaningful.
  const w = strip.width;
  for (let i = 0; i < 8; i++) {
    fillRect(strip, 2 + i * 6, y0 + 2, 5 + i * 6, y1 - 2, mark);
    fillRect(strip, w - 5 - i * 6, y0 + 2, w - 2 - i * 6, y1 - 2, mark);
  }
}
function fillRectRgb(
  strip: PixelBuffer,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  [r, g, b]: [number, number, number],
) {
  for (let y = y0; y < y1 && y < strip.height; y++)
    for (let x = x0; x < x1 && x < strip.width; x++) {
      const i = (y * strip.width + x) * 4;
      strip.data[i] = r;
      strip.data[i + 1] = g;
      strip.data[i + 2] = b;
    }
}

describe("screenshot status bar detection", () => {
  it("finds a clear status bar with a background change and icon marks", () => {
    const width = 180,
      fullHeight = 400,
      statusRatio = 0.05,
      y = Math.round(statusRatio * fullHeight),
      strip = makeStrip(width, 60, 245);
    paintIconMarks(strip, 0, y, 40);
    fillRect(strip, 0, y, width, 60, 30);
    const result = detectStatusBar(strip, fullHeight);
    expect(result.detected).toBe(true);
    if (result.detected) {
      expect(result.cropRatio).toBeCloseTo(statusRatio, 1);
      // A single strong color step can plateau across several deeper
      // candidates that all sit inside the same header color — "high"
      // confidence specifically requires a clear score margin over every
      // other candidate, so a flat single-color header (as in this fixture)
      // legitimately downgrades to "medium". Real-world detections landed on
      // "medium" for the same reason during manual browser testing.
      expect(["high", "medium"]).toContain(result.confidence);
    }
  });

  it("does not fall back to a deep header/content boundary when the status bar and header share one flat color with no icon signal", () => {
    // Reproduces a second real failure found in testing: when the status bar
    // and the app's own header are truly the same flat color end to end (no
    // icons/text strong enough to register), the only real color change left
    // is the header/content boundary further down. A pure color-drift signal
    // would otherwise confidently crop there instead of failing safely.
    const width = 180,
      fullHeight = 400,
      strip = makeStrip(width, 40, 220);
    fillRect(strip, 0, 28, width, 40, 255); // ratio 0.07 — past DRIFT_ONLY_MAX_RATIO
    expect(detectStatusBar(strip, fullHeight)).toEqual({
      detected: false,
      confidence: "low",
    });
  });

  it("prefers the shallower boundary over a stronger deeper one (app header protection)", () => {
    const width = 180,
      fullHeight = 400,
      statusRatio = 0.03,
      headerRatio = 0.07,
      statusY = Math.round(statusRatio * fullHeight),
      headerY = Math.round(headerRatio * fullHeight),
      strip = makeStrip(width, 40, 250);
    // status bar: icon marks only, no color change from the header below it
    paintIconMarks(strip, 0, statusY, 60);
    // header: same background as status bar, but a strong, high-contrast
    // boundary against the app content further down — this would score
    // higher than the status bar line if "strongest wins" were used.
    fillRect(strip, 0, headerY, width, 40, 10);
    const result = detectStatusBar(strip, fullHeight);
    expect(result.detected).toBe(true);
    if (result.detected) {
      expect(result.cropRatio).toBeCloseTo(statusRatio, 1);
      expect(result.cropRatio).toBeLessThan(headerRatio);
    }
  });

  it("does not detect a status bar on a flat full-screen image", () => {
    const strip = makeStrip(180, 40, 200);
    expect(detectStatusBar(strip, 400)).toEqual({
      detected: false,
      confidence: "low",
    });
  });

  it("reports medium confidence when only one weak signal is present", () => {
    const width = 180,
      fullHeight = 400,
      statusRatio = 0.03,
      y = Math.round(statusRatio * fullHeight),
      strip = makeStrip(width, 40, 245);
    // a background change only, no icon-like marks — clearly weaker than
    // the high-confidence fixture's contrast, but still real evidence.
    fillRect(strip, 0, y, width, 40, 205);
    const result = detectStatusBar(strip, fullHeight);
    expect(result.detected).toBe(true);
    if (result.detected) expect(result.confidence).toBe("medium");
  });

  it("finds the shallow boundary even when the app header is only subtly different from a theme-matched status bar", () => {
    // Reproduces a real failure found in testing: Korean apps (Naver etc.)
    // often theme their own header to nearly match the status bar color, so
    // a local edge/diff signal is too weak there — but the app's header still
    // ends at a strongly different color further down. Picking the strongest
    // boundary instead of the shallowest would crop into the app's own logo.
    const width = 180,
      fullHeight = 400,
      statusRatio = 0.03,
      headerRatio = 0.07,
      statusY = Math.round(statusRatio * fullHeight),
      headerY = Math.round(headerRatio * fullHeight),
      strip = makeStrip(width, 40, 0);
    fillRectRgb(strip, 0, 0, width, statusY, [40, 150, 40]);
    fillRectRgb(strip, 0, statusY, width, headerY, [58, 168, 55]); // subtly different green
    fillRectRgb(strip, 0, headerY, width, 40, [255, 255, 255]); // strongly different
    const result = detectStatusBar(strip, fullHeight);
    expect(result.detected).toBe(true);
    if (result.detected) {
      expect(result.cropRatio).toBeCloseTo(statusRatio, 1);
      expect(result.cropRatio).toBeLessThan(headerRatio);
    }
  });

  it("scores color drift near zero for a uniformly colored region", () => {
    const strip = makeStrip(100, 20, 200),
      reference = referenceColor(strip);
    expect(colorDriftScore(strip, 10, reference)).toBeLessThan(0.02);
  });
  it("scores color drift higher once the row color departs from the reference", () => {
    const strip = makeStrip(100, 20, 200),
      reference = referenceColor(strip);
    fillRectRgb(strip, 0, 10, 100, 20, [200, 60, 60]);
    expect(colorDriftScore(strip, 15, reference)).toBeGreaterThan(0.3);
  });

  it("scores edge asymmetry higher for left/right marks than a flat band", () => {
    const strip = makeStrip(180, 20, 240);
    expect(edgeAsymmetryScore(strip, 15)).toBeLessThan(0.02);
    paintIconMarks(strip, 0, 15, 40);
    expect(edgeAsymmetryScore(strip, 15)).toBeGreaterThan(0.05);
  });

  it("weights the height prior toward common status bar ratios", () => {
    expect(heightPriorScore(0.03)).toBeGreaterThan(heightPriorScore(0.12));
    expect(heightPriorScore(0.05)).toBeGreaterThan(heightPriorScore(0.15));
  });

  it("keeps full score for typical phone aspect ratios and decays outside it", () => {
    expect(aspectPenalty(1080, 2400)).toBe(1);
    expect(aspectPenalty(1080, 1000)).toBeLessThan(1);
  });
});
describe("screenshot status bar geometry", () => {
  it("clamps crop height to the image and slider maximum", () => {
    expect(clampCropHeight(500, 1000, 200)).toBe(200);
    expect(clampCropHeight(-5, 1000, 200)).toBe(0);
    expect(clampCropHeight(50, 1000, 200)).toBe(50);
  });
  it("caps the slider maximum at 200px or 15% of image height", () => {
    expect(maxCropHeightFor(3000)).toBe(200);
    expect(maxCropHeightFor(800)).toBe(120);
  });
  it("maps a client Y position to image coordinates", () =>
    expect(clientYToImageY(120, { top: 20, height: 200 }, 800)).toBe(400));
});
describe("screenshot status bar validation", () => {
  it("accepts supported files", () =>
    expect(
      validateFile(new File(["x"], "x.png", { type: "image/png" })),
    ).toBeNull());
  it("rejects unsupported files", () =>
    expect(validateFile(new File(["x"], "x.gif", { type: "image/gif" }))).toBe(
      "unsupported-type",
    ));
  it("enforces dimensions", () => {
    expect(validDimensions(4000, 10000)).toBe(true);
    expect(validDimensions(17000, 1)).toBe(false);
  });
  it("flags landscape and too-small images", () => {
    expect(isLandscape(2000, 1000)).toBe(true);
    expect(isLandscape(1000, 2000)).toBe(false);
    expect(isTooSmallToDetect(300, 300)).toBe(true);
    expect(canAutoDetect(1080, 2400)).toBe(true);
    expect(canAutoDetect(2000, 1000)).toBe(false);
  });
});
