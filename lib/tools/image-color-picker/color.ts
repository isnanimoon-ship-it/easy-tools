export type Rgba = { r: number; g: number; b: number; a: number };
export type ColorFormats = { hex: string; rgb: string; hsl: string; hsv: string; cmyk: string };

const byte = (value: number) => Math.min(255, Math.max(0, Math.round(value)));
const percent = (value: number) => Math.round(value * 100);
const alphaText = (a: number) => String(Math.round((byte(a) / 255) * 1000) / 1000);
const hexByte = (value: number) => byte(value).toString(16).padStart(2, "0").toUpperCase();

export function rgbaToHex({ r, g, b, a }: Rgba) {
  const base = `#${hexByte(r)}${hexByte(g)}${hexByte(b)}`;
  return byte(a) === 255 ? base : `${base}${hexByte(a)}`;
}

export function rgbaToHsl({ r, g, b, a }: Rgba) {
  const rn = byte(r) / 255, gn = byte(g) / 255, bn = byte(b) / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), delta = max - min;
  const l = (max + min) / 2; let h = 0;
  if (delta) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = Math.round(h * 60); if (h < 0) h += 360; if (h === 360) h = 0;
  }
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: percent(s), l: percent(l), a: byte(a) };
}

export function rgbaToHsv({ r, g, b, a }: Rgba) {
  const rn = byte(r) / 255, gn = byte(g) / 255, bn = byte(b) / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), delta = max - min; let h = 0;
  if (delta) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = Math.round(h * 60); if (h < 0) h += 360; if (h === 360) h = 0;
  }
  return { h, s: percent(max === 0 ? 0 : delta / max), v: percent(max), a: byte(a) };
}

export function rgbToCmyk({ r, g, b }: Rgba) {
  const rn = byte(r) / 255, gn = byte(g) / 255, bn = byte(b) / 255; const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return { c: percent((1 - rn - k) / (1 - k)), m: percent((1 - gn - k) / (1 - k)), y: percent((1 - bn - k) / (1 - k)), k: percent(k) };
}

export function formatColorValues(input: Rgba): ColorFormats {
  const value = { r: byte(input.r), g: byte(input.g), b: byte(input.b), a: byte(input.a) };
  const hsl = rgbaToHsl(value), hsv = rgbaToHsv(value), cmyk = rgbToCmyk(value); const alpha = alphaText(value.a);
  return {
    hex: rgbaToHex(value),
    rgb: value.a === 255 ? `rgb(${value.r}, ${value.g}, ${value.b})` : `rgba(${value.r}, ${value.g}, ${value.b}, ${alpha})`,
    hsl: value.a === 255 ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alpha})`,
    hsv: value.a === 255 ? `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)` : `hsva(${hsv.h}, ${hsv.s}%, ${hsv.v}%, ${alpha})`,
    cmyk: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
  };
}
