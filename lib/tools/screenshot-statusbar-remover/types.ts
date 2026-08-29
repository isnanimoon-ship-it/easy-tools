export type PixelBuffer = {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
};
export type Confidence = "high" | "medium" | "low";
export type DetectionResult =
  | { detected: true; cropRatio: number; confidence: "high" | "medium" }
  | { detected: false; confidence: "low" };
