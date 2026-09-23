import type { ImageMime } from "@/lib/tools/image-compressor/file-validation";

export type WatermarkMode = "text" | "image";
export type WatermarkPosition = "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right";
export type TextEffect = "none" | "shadow" | "background";
export type FontFamily = "sans" | "serif" | "mono";
export type OutputMime = "original" | ImageMime;

export type WatermarkSettings = {
  mode: WatermarkMode;
  text: string;
  fontFamily: FontFamily;
  bold: boolean;
  color: string;
  effect: TextEffect;
  sizePercent: number;
  imageSizePercent: number;
  opacity: number;
  rotation: number;
  position: WatermarkPosition;
  marginPercent: number;
  repeat: boolean;
  gapPercent: number;
  outputMime: OutputMime;
  quality: number;
};

export const DEFAULT_SETTINGS: WatermarkSettings = {
  mode: "text", text: "", fontFamily: "sans", bold: true, color: "#ffffff", effect: "shadow",
  sizePercent: 5, imageSizePercent: 20, opacity: 70, rotation: 0, position: "bottom-right",
  marginPercent: 3, repeat: false, gapPercent: 50, outputMime: "original", quality: 92,
};
