export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const PERF_WARNING_BYTES = 2 * 1024 * 1024;
export const PERF_WARNING_LINES = 50_000;

export function inputByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function exceedsMaxInput(text: string): boolean {
  return inputByteLength(text) > MAX_INPUT_BYTES;
}

export function shouldWarnLargeInput(text: string): boolean {
  if (inputByteLength(text) > PERF_WARNING_BYTES) return true;
  return text.split("\n").length > PERF_WARNING_LINES;
}
