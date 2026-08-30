export type HexColor = string;

export type TextSpec = {
  kind: "text";
  text: string;
  background: HexColor;
  foreground: HexColor;
  bold: boolean;
};

export type EmojiSpec = {
  kind: "emoji";
  emoji: string;
  background: HexColor;
};

export type ShapeKind = "square" | "rounded" | "circle";

export type ShapeContent =
  | { type: "text"; text: string; foreground: HexColor }
  | { type: "emoji"; emoji: string }
  | { type: "none" };

export type ShapeBorder = { color: HexColor; width: number };

export type ShapeSpec = {
  kind: "shape";
  shape: ShapeKind;
  background: HexColor;
  border: ShapeBorder | null;
  radius: number; // fraction of size, 0-0.5, used only when shape === "rounded"
  content: ShapeContent;
};

export type CropState = {
  zoom: number; // >= 1
  panX: number; // -1..1
  panY: number; // -1..1
};

export const DEFAULT_CROP: CropState = { zoom: 1, panX: 0, panY: 0 };

export type ImageBackground = "transparent" | { color: HexColor };

export type ImageSpec = {
  kind: "image";
  bitmap: ImageBitmap;
  crop: CropState;
  background: ImageBackground;
};

export type FaviconSpec = TextSpec | EmojiSpec | ShapeSpec | ImageSpec;

// Display-only sizes for the live preview grid — 192/512 read as visually
// identical to 180 at any reasonable on-screen scale, so showing them adds
// clutter without adding information. The actual generated file set below
// still includes all required output sizes regardless of what's previewed.
export const PREVIEW_SIZES = [16, 32, 48, 64, 180] as const;
export const OUTPUT_PNG_SIZES = [16, 32, 48, 180, 192, 512] as const;
export const ICO_SIZES = [16, 32, 48] as const;
