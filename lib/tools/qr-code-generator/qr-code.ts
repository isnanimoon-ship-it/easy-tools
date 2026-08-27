export type QrSize = 128 | 256 | 512 | 1024;
export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";
export type QuietZone = 4 | 6 | 8;
export type InputType = "text" | "url";
export type QrGenerationError = "capacity-exceeded" | "size-too-small" | "generation-failed";

export type QrOptions = { size: QrSize; level: ErrorCorrectionLevel; margin: QuietZone };
export type QrMetadata = { version: number; moduleCount: number; modulePixels: number; warning: boolean };
export type QrGenerationResult = { ok: true; metadata: QrMetadata } | { ok: false; reason: QrGenerationError };

export const QR_SIZES = [128, 256, 512, 1024] as const;
export const ERROR_LEVELS = ["L", "M", "Q", "H"] as const;
export const QUIET_ZONES = [4, 6, 8] as const;
export const DEFAULT_QR_OPTIONS: QrOptions = { size: 256, level: "M", margin: 4 };

export function detectInputType(input: string): InputType {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:" ? "url" : "text";
  } catch { return "text"; }
}

export function calculateModulePixels(size: number, moduleCount: number, margin: number): number {
  if (!Number.isFinite(size) || !Number.isInteger(moduleCount) || moduleCount <= 0 || !Number.isInteger(margin) || margin < 0) return 0;
  return Math.floor(size / (moduleCount + margin * 2));
}

export function shouldWarnForDensity(version: number, input: string): boolean {
  return version >= 25 || new TextEncoder().encode(input).byteLength >= 800;
}

export function classifyGenerationError(error: unknown): QrGenerationError {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("code length overflow") || message.includes("amount of data is too big")
    ? "capacity-exceeded" : "generation-failed";
}

export async function renderQrCode(canvas: HTMLCanvasElement, input: string, options: QrOptions): Promise<QrGenerationResult> {
  try {
    const QRCode = await import("qrcode");
    const symbol = QRCode.create(input, { errorCorrectionLevel: options.level });
    const modulePixels = calculateModulePixels(options.size, symbol.modules.size, options.margin);
    if (modulePixels < 2) return { ok: false, reason: "size-too-small" };
    await QRCode.toCanvas(canvas, input, {
      errorCorrectionLevel: options.level, margin: options.margin, width: options.size,
      color: { dark: "#000000ff", light: "#ffffffff" },
    });
    return { ok: true, metadata: { version: symbol.version, moduleCount: symbol.modules.size, modulePixels, warning: shouldWarnForDensity(symbol.version, input) } };
  } catch (error) { return { ok: false, reason: classifyGenerationError(error) }; }
}
