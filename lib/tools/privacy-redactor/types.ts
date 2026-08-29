export type Rect = { x: number; y: number; width: number; height: number };
export type RedactionRegion = Rect & {
  id: string;
  selected: boolean;
};
export type MaskStyle = {
  kind: "solid" | "pixelate";
  color: "#000000" | "#ffffff";
  pixelSize: 8 | 16 | 24;
};
