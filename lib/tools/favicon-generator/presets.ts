import type { HexColor, ShapeBorder, ShapeKind } from "./types";

export type FaviconPreset = {
  id: string;
  background: HexColor;
  foreground: HexColor;
  shape: ShapeKind;
  radius: number;
  border: ShapeBorder | null;
  bold: boolean;
};

/**
 * Fixed background/shape/border combos for a "quick start" gallery. Colors were
 * chosen and verified (see favicon-generator.test.ts) to clear the same
 * LOW_CONTRAST_THRESHOLD used elsewhere in this tool, so applying one never
 * immediately triggers the low-contrast warning.
 */
export const FAVICON_PRESETS: readonly FaviconPreset[] = [
  { id: "ocean", background: "#2563EB", foreground: "#FFFFFF", shape: "rounded", radius: 0.25, border: null, bold: true },
  { id: "sunset", background: "#EA580C", foreground: "#FFFFFF", shape: "circle", radius: 0, border: null, bold: true },
  { id: "forest", background: "#059669", foreground: "#FFFFFF", shape: "square", radius: 0, border: null, bold: true },
  { id: "grape", background: "#7C3AED", foreground: "#FFFFFF", shape: "rounded", radius: 0.5, border: null, bold: true },
  { id: "charcoal", background: "#111827", foreground: "#FFFFFF", shape: "circle", radius: 0, border: null, bold: true },
  { id: "outline", background: "#FFFFFF", foreground: "#111827", shape: "rounded", radius: 0.2, border: { color: "#111827", width: 3 }, bold: true },
  { id: "rose", background: "#E11D48", foreground: "#FFFFFF", shape: "square", radius: 0, border: null, bold: false },
  { id: "amber", background: "#D97706", foreground: "#111827", shape: "rounded", radius: 0.3, border: null, bold: true },
];
