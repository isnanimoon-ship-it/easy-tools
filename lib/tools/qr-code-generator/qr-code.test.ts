import QRCode from "qrcode";
import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { calculateModulePixels, classifyGenerationError, compositeLogo, detectInputType, effectiveLevelForLogo, shouldWarnForDensity } from "./qr-code";

describe("QR domain rules", () => {
  it.each([["https://example.com", "url"], ["http://example.com/a?q=1", "url"], ["example.com", "text"], ["Hello", "text"], ["mailto:a@example.com", "text"]])("classifies %s without normalization", (input, expected) => expect(detectInputType(input)).toBe(expected));
  it("calculates conservative integer pixels per module", () => {
    expect(calculateModulePixels(256, 21, 4)).toBe(8); expect(calculateModulePixels(128, 100, 4)).toBe(1); expect(calculateModulePixels(128, 0, 4)).toBe(0);
  });
  it("warns at either density threshold", () => {
    expect(shouldWarnForDensity(25, "short")).toBe(true); expect(shouldWarnForDensity(1, "가".repeat(267))).toBe(true); expect(shouldWarnForDensity(24, "short")).toBe(false);
  });
  it("normalizes capacity errors without leaking exception text", () => {
    expect(classifyGenerationError(new Error("The amount of data is too big"))).toBe("capacity-exceeded"); expect(classifyGenerationError(new Error("canvas failed"))).toBe("generation-failed");
  });
});

describe("effectiveLevelForLogo", () => {
  it("leaves the level unchanged when there is no logo", () => {
    for (const level of ["L", "M", "Q", "H"] as const) expect(effectiveLevelForLogo(level, false)).toBe(level);
  });

  it("raises L and M up to Q when a logo is present", () => {
    expect(effectiveLevelForLogo("L", true)).toBe("Q");
    expect(effectiveLevelForLogo("M", true)).toBe("Q");
  });

  it("keeps Q and H unchanged when a logo is present", () => {
    expect(effectiveLevelForLogo("Q", true)).toBe("Q");
    expect(effectiveLevelForLogo("H", true)).toBe("H");
  });
});

describe("compositeLogo", () => {
  // jsdom has no Canvas 2D rendering backend in this project, so actual pixel output
  // (white backdrop + centered logo) is verified in the browser QA script instead.
  it("does nothing when the canvas has no 2d context", () => {
    const canvas = document.createElement("canvas");
    const original = canvas.getContext.bind(canvas);
    canvas.getContext = ((id: string) => (id === "2d" ? null : original(id))) as typeof canvas.getContext;
    expect(() => compositeLogo(canvas, { image: canvas, sizeRatio: 0.2 })).not.toThrow();
  });
});

function decodeSymbol(input: string, level: "L" | "M" | "Q" | "H") {
  const qr = QRCode.create(input, { errorCorrectionLevel: level }); const scale = 8; const margin = 4;
  const side = (qr.modules.size + margin * 2) * scale; const data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let row = 0; row < qr.modules.size; row++) for (let col = 0; col < qr.modules.size; col++) if (qr.modules.get(row, col)) {
    for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) { const offset = (((row + margin) * scale + y) * side + (col + margin) * scale + x) * 4; data[offset] = 0; data[offset + 1] = 0; data[offset + 2] = 0; }
  }
  return jsQR(data, side, side, { inversionAttempts: "dontInvert" })?.data;
}

describe("required independent QR round trips", () => {
  it.each(["Hello World", "안녕하세요", "こんにちは", "https://example.com", "Emoji 😀🚀"])("restores %s at every level", (input) => {
    for (const level of ["L", "M", "Q", "H"] as const) expect(decodeSymbol(input, level)).toBe(input);
  });
});
