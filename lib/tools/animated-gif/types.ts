export type FrameFit = "contain" | "cover";

export type GifFrameSource = {
  bitmap: ImageBitmap;
  durationMs: number;
};

export type GifSettings = {
  width: number;
  height: number;
  fit: FrameFit;
  background: string;
  colors: 64 | 128 | 256;
  repeat: 0 | -1;
};

export const MAX_FILES = 20;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_INPUT_PIXELS = 24_000_000;
export const MAX_TOTAL_INPUT_PIXELS = 80_000_000;
export const MAX_OUTPUT_DIMENSION = 1600;
export const MAX_OUTPUT_FRAME_PIXELS = 40_000_000;

