import { cropRect } from "./crop";
import type { EmojiSpec, FaviconSpec, ShapeSpec, TextSpec } from "./types";

const FONT_FAMILY = "system-ui, sans-serif";
const EMOJI_FONT_STACK = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
const BASELINE_CORRECTION = 0.03; // fillText's optical center sits slightly above true middle

/**
 * Shrinks font size via measureText until the text fits within a safe
 * margin, rather than a closed-form formula — actual glyph width varies
 * by font and can't be predicted from character count alone.
 */
export function fitTextFontSize(
  ctx: Pick<CanvasRenderingContext2D, "font" | "measureText">,
  text: string,
  canvasSize: number,
  bold: boolean,
): number {
  const safeWidth = canvasSize * 0.82;
  const minFontSize = Math.max(1, Math.floor(canvasSize * 0.2));
  const weight = bold ? "bold " : "";
  let fontSize = Math.floor(canvasSize * 0.66);
  ctx.font = `${weight}${fontSize}px ${FONT_FAMILY}`;
  let iterations = 0;
  while (fontSize > minFontSize && ctx.measureText(text).width > safeWidth && iterations < 40) {
    fontSize -= Math.max(1, Math.floor(fontSize * 0.05));
    ctx.font = `${weight}${fontSize}px ${FONT_FAMILY}`;
    iterations++;
  }
  return fontSize;
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  fontSize: number,
  fontStack: string,
  bold: boolean,
) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${bold ? "bold " : ""}${fontSize}px ${fontStack}`;
  ctx.fillText(text, size / 2, size / 2 + size * BASELINE_CORRECTION);
}

function drawText(ctx: CanvasRenderingContext2D, spec: TextSpec, size: number) {
  ctx.fillStyle = spec.background;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = spec.foreground;
  const fontSize = fitTextFontSize(ctx, spec.text, size, spec.bold);
  drawCenteredText(ctx, spec.text, size, fontSize, FONT_FAMILY, spec.bold);
}

function drawEmoji(ctx: CanvasRenderingContext2D, spec: EmojiSpec, size: number) {
  ctx.fillStyle = spec.background;
  ctx.fillRect(0, 0, size, size);
  const fontSize = Math.floor(size * 0.7);
  drawCenteredText(ctx, spec.emoji, size, fontSize, EMOJI_FONT_STACK, false);
}

function pathForShape(ctx: CanvasRenderingContext2D, spec: ShapeSpec, size: number) {
  ctx.beginPath();
  if (spec.shape === "circle") {
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  } else if (spec.shape === "rounded") {
    const r = Math.max(0, Math.min(0.5, spec.radius)) * size;
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(0, 0, size, size, r);
    } else {
      ctx.moveTo(r, 0);
      ctx.lineTo(size - r, 0);
      ctx.arcTo(size, 0, size, r, r);
      ctx.lineTo(size, size - r);
      ctx.arcTo(size, size, size - r, size, r);
      ctx.lineTo(r, size);
      ctx.arcTo(0, size, 0, size - r, r);
      ctx.lineTo(0, r);
      ctx.arcTo(0, 0, r, 0, r);
    }
  } else {
    ctx.rect(0, 0, size, size);
  }
  ctx.closePath();
}

function drawShape(ctx: CanvasRenderingContext2D, spec: ShapeSpec, size: number) {
  pathForShape(ctx, spec, size);
  ctx.fillStyle = spec.background;
  ctx.fill();
  if (spec.border && spec.border.width > 0) {
    ctx.lineWidth = spec.border.width;
    ctx.strokeStyle = spec.border.color;
    ctx.stroke();
  }
  if (spec.content.type === "text") {
    ctx.fillStyle = spec.content.foreground;
    const fontSize = fitTextFontSize(ctx, spec.content.text, size, false);
    drawCenteredText(ctx, spec.content.text, size, fontSize, FONT_FAMILY, false);
  } else if (spec.content.type === "emoji") {
    const fontSize = Math.floor(size * 0.6);
    drawCenteredText(ctx, spec.content.emoji, size, fontSize, EMOJI_FONT_STACK, false);
  }
}

function drawImageSource(
  ctx: CanvasRenderingContext2D,
  spec: Extract<FaviconSpec, { kind: "image" }>,
  size: number,
) {
  if (spec.background !== "transparent") {
    ctx.fillStyle = spec.background.color;
    ctx.fillRect(0, 0, size, size);
  }
  const { sx, sy, sw, sh } = cropRect(spec.bitmap, spec.crop);
  ctx.drawImage(spec.bitmap, sx, sy, sw, sh, 0, 0, size, size);
}

export function renderFavicon(ctx: CanvasRenderingContext2D, spec: FaviconSpec, size: number): void {
  ctx.clearRect(0, 0, size, size);
  switch (spec.kind) {
    case "text":
      drawText(ctx, spec, size);
      break;
    case "emoji":
      drawEmoji(ctx, spec, size);
      break;
    case "shape":
      drawShape(ctx, spec, size);
      break;
    case "image":
      drawImageSource(ctx, spec, size);
      break;
  }
}
