export type QrSize = 128 | 256 | 512 | 1024;
export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";
export type QuietZone = 4 | 6 | 8;
export type InputType = "text" | "url";
export type QrGenerationError = "capacity-exceeded" | "size-too-small" | "generation-failed";

export type QrOptions = { size: QrSize; level: ErrorCorrectionLevel; margin: QuietZone };
export type QrLogoOptions = { image: CanvasImageSource; sizeRatio: number };
export type QrMetadata = {
  version: number;
  moduleCount: number;
  modulePixels: number;
  warning: boolean;
  effectiveLevel: ErrorCorrectionLevel;
};
export type QrGenerationResult = { ok: true; metadata: QrMetadata } | { ok: false; reason: QrGenerationError };

const LEVEL_ORDER: ErrorCorrectionLevel[] = ["L", "M", "Q", "H"];
const MIN_LEVEL_WITH_LOGO: ErrorCorrectionLevel = "Q";

export function effectiveLevelForLogo(level: ErrorCorrectionLevel, hasLogo: boolean): ErrorCorrectionLevel {
  if (!hasLogo) return level;
  return LEVEL_ORDER.indexOf(level) < LEVEL_ORDER.indexOf(MIN_LEVEL_WITH_LOGO) ? MIN_LEVEL_WITH_LOGO : level;
}

export function compositeLogo(canvas: HTMLCanvasElement, logo: QrLogoOptions): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  const logoSize = canvas.width * logo.sizeRatio;
  const padding = logoSize * 0.12;
  const backdropSize = logoSize + padding * 2;
  const backdropOffset = (canvas.width - backdropSize) / 2;
  const logoOffset = (canvas.width - logoSize) / 2;

  context.fillStyle = "#ffffff";
  context.fillRect(backdropOffset, backdropOffset, backdropSize, backdropSize);
  context.drawImage(logo.image, logoOffset, logoOffset, logoSize, logoSize);
}

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

export async function renderQrCode(
  canvas: HTMLCanvasElement,
  input: string,
  options: QrOptions,
  logo?: QrLogoOptions,
): Promise<QrGenerationResult> {
  try {
    const QRCode = await import("qrcode");
    const effectiveLevel = effectiveLevelForLogo(options.level, Boolean(logo));
    const symbol = QRCode.create(input, { errorCorrectionLevel: effectiveLevel });
    const modulePixels = calculateModulePixels(options.size, symbol.modules.size, options.margin);
    if (modulePixels < 2) return { ok: false, reason: "size-too-small" };
    await QRCode.toCanvas(canvas, input, {
      errorCorrectionLevel: effectiveLevel, margin: options.margin, width: options.size,
      color: { dark: "#000000ff", light: "#ffffffff" },
    });
    if (logo) compositeLogo(canvas, logo);
    return {
      ok: true,
      metadata: {
        version: symbol.version,
        moduleCount: symbol.modules.size,
        modulePixels,
        warning: shouldWarnForDensity(symbol.version, input),
        effectiveLevel,
      },
    };
  } catch (error) { return { ok: false, reason: classifyGenerationError(error) }; }
}
