import type { DetectionResult, PixelBuffer } from "./types";

export const CANDIDATE_RATIOS = [
  0.015, 0.02, 0.025, 0.03, 0.035, 0.04, 0.05, 0.06, 0.07, 0.08,
];
const REFERENCE_ROWS = 4;
const DRIFT_SCALE = 150;
const DRIFT_FLOOR = 0.12;
const ASYM_FLOOR = 0.12;
const NEAR_BEST_TOLERANCE = 0.1;
const HIGH_SCORE = 0.34;
const HIGH_MARGIN = 0.08;
const DRIFT_PRESENT = 0.12;
const WEIGHT_DRIFT = 0.3;
const WEIGHT_ASYMMETRY = 0.45;
const WEIGHT_PRIOR = 0.25;
const ASPECT_MIN = 0.4;
const ASPECT_MAX = 0.55;
const PRIOR_LOW_MU = 0.03;
const PRIOR_LOW_SIGMA = 0.008;
const PRIOR_HIGH_MU = 0.05;
const PRIOR_HIGH_SIGMA = 0.012;

type RgbColor = [number, number, number];

function luminance(pixels: PixelBuffer, x: number, y: number): number {
  const i = (y * pixels.width + x) * 4;
  return (
    0.299 * pixels.data[i] + 0.587 * pixels.data[i + 1] + 0.114 * pixels.data[i + 2]
  );
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b),
    mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function rowBandMedianColor(
  pixels: PixelBuffer,
  yStart: number,
  yEnd: number,
): RgbColor {
  const r: number[] = [],
    g: number[] = [],
    b: number[] = [];
  for (let y = yStart; y < yEnd; y++)
    for (let x = 0; x < pixels.width; x++) {
      const i = (y * pixels.width + x) * 4;
      r.push(pixels.data[i]);
      g.push(pixels.data[i + 1]);
      b.push(pixels.data[i + 2]);
    }
  return [medianOf(r), medianOf(g), medianOf(b)];
}

function colorDistance(a: RgbColor, b: RgbColor): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * The status bar's own background color, sampled as the per-channel median
 * of the top few rows (median rather than mean so a status-bar icon
 * occupying a minority of the row's pixels can't skew the estimate).
 */
export function referenceColor(pixels: PixelBuffer): RgbColor {
  return rowBandMedianColor(pixels, 0, Math.min(REFERENCE_ROWS, pixels.height));
}

/**
 * How far row `y`'s own (median, icon-robust) color has drifted from the
 * status bar's reference color. This replaces a local row-to-row edge
 * comparison: a local comparison is noisy right where status-bar icons sit,
 * and — more importantly — is too weak to notice when an app deliberately
 * themes its header to nearly match the status bar color (very common for
 * Korean apps). Comparing every row back to a single stable top reference
 * still accumulates a small-but-real color difference into a usable signal.
 */
export function colorDriftScore(
  pixels: PixelBuffer,
  y: number,
  reference: RgbColor,
): number {
  if (y < 1 || y > pixels.height - 2) return 0;
  const rowColor = rowBandMedianColor(pixels, y, y + 1);
  return Math.min(1, colorDistance(rowColor, reference) / DRIFT_SCALE);
}

function regionEdgeDensity(
  pixels: PixelBuffer,
  xStart: number,
  xEnd: number,
  yEnd: number,
): number {
  if (yEnd < 2 || xEnd <= xStart + 1) return 0;
  let sum = 0,
    count = 0;
  for (let y = 0; y < yEnd - 1; y++)
    for (let x = xStart; x < xEnd - 1; x++) {
      const center = luminance(pixels, x, y);
      sum +=
        Math.abs(luminance(pixels, x + 1, y) - center) +
        Math.abs(luminance(pixels, x, y + 1) - center);
      count++;
    }
  return count ? Math.min(1, sum / count / 255) : 0;
}

export function edgeAsymmetryScore(pixels: PixelBuffer, y: number): number {
  const w = pixels.width,
    left = regionEdgeDensity(pixels, 0, Math.round(w * 0.3), y),
    center = regionEdgeDensity(pixels, Math.round(w * 0.35), Math.round(w * 0.65), y),
    right = regionEdgeDensity(pixels, Math.round(w * 0.7), w, y);
  return Math.max(0, Math.min(1, (left + right) / 2 - center * 0.5));
}

function gaussian(ratio: number, mu: number, sigma: number): number {
  const d = (ratio - mu) / sigma;
  return Math.exp(-0.5 * d * d);
}
export function heightPriorScore(ratio: number): number {
  return Math.max(
    gaussian(ratio, PRIOR_LOW_MU, PRIOR_LOW_SIGMA),
    gaussian(ratio, PRIOR_HIGH_MU, PRIOR_HIGH_SIGMA),
  );
}

export function aspectPenalty(width: number, height: number): number {
  const ratio = width / height;
  if (ratio >= ASPECT_MIN && ratio <= ASPECT_MAX) return 1;
  const distance = ratio < ASPECT_MIN ? ASPECT_MIN - ratio : ratio - ASPECT_MAX;
  return Math.max(0.15, 1 - distance * 4);
}

export type Candidate = {
  ratio: number;
  y: number;
  score: number;
  drift: number;
  asymmetry: number;
};

export function scoreCandidates(
  topStrip: PixelBuffer,
  fullHeight: number,
): Candidate[] {
  const penalty = aspectPenalty(topStrip.width, fullHeight),
    reference = referenceColor(topStrip);
  return CANDIDATE_RATIOS.map((ratio) => Math.round(ratio * fullHeight))
    .filter((y) => y >= 2 && y <= topStrip.height - 3)
    .map((y) => {
      const ratio = y / fullHeight,
        drift = colorDriftScore(topStrip, y, reference),
        asymmetry = edgeAsymmetryScore(topStrip, y),
        prior = heightPriorScore(ratio),
        score =
          (WEIGHT_DRIFT * drift +
            WEIGHT_ASYMMETRY * asymmetry +
            WEIGHT_PRIOR * prior) *
          penalty;
      return { ratio, y, score, drift, asymmetry };
    });
}

/**
 * A candidate only qualifies if it has real visual evidence (drifted from
 * the status bar's reference color, or an icon-like density cluster) at
 * that exact line — the height prior alone can never qualify a candidate.
 * Without this floor, a fully flat image (no status bar at all) still
 * "detects" one, because the prior term is enough on its own to clear a
 * naive score threshold.
 */
/**
 * A drift-only candidate (no icon-like corroboration) is only trusted within
 * the plausible status-bar ratio range. When the status bar and the app's
 * own header share one background color end to end (common when an app
 * themes its whole top area to match the status bar), the only real color
 * change left is the header/content boundary further down — drift alone
 * would otherwise confidently pick that too-deep line instead of failing
 * safely. Icon corroboration is exempt from this cap since real status-bar
 * icons can legitimately coincide with a deeper ratio on tall/notched phones.
 */
const DRIFT_ONLY_MAX_RATIO = 0.055;

function hasEvidence(candidate: Candidate): boolean {
  if (candidate.asymmetry >= ASYM_FLOOR) return true;
  return candidate.drift >= DRIFT_FLOOR && candidate.ratio <= DRIFT_ONLY_MAX_RATIO;
}

export function detectStatusBar(
  topStrip: PixelBuffer,
  fullHeight: number,
): DetectionResult {
  const candidates = scoreCandidates(topStrip, fullHeight),
    eligible = candidates.filter(hasEvidence);
  if (!eligible.length) return { detected: false, confidence: "low" };
  const bestScore = Math.max(...eligible.map((c) => c.score)),
    // Among candidates that are comparably strong, prefer the shallowest —
    // an app-header/content boundary further down can score higher than the
    // real status-bar line, and picking "strongest wins" would crop into
    // the header. Picking "first to clear a low bar" instead can grab a
    // spurious shallow candidate, so we only consider ones close to the best.
    nearBest = eligible.filter((c) => c.score >= bestScore - NEAR_BEST_TOLERANCE),
    best = nearBest.reduce((a, b) => (a.ratio < b.ratio ? a : b)),
    maxOther = Math.max(
      0,
      ...candidates.filter((c) => c !== best).map((c) => c.score),
    ),
    isHigh =
      best.score >= HIGH_SCORE &&
      best.score - maxOther >= HIGH_MARGIN &&
      best.drift >= DRIFT_PRESENT;
  return {
    detected: true,
    cropRatio: best.ratio,
    confidence: isHigh ? "high" : "medium",
  };
}
