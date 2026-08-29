import { describe, expect, it } from "vitest";
import { clientToImage, clampRect } from "./geometry";
import { validDimensions, validateFile } from "./validation";

describe("privacy redactor geometry", () => {
  it("maps displayed points to original pixels", () =>
    expect(
      clientToImage(
        190,
        120,
        { left: 10, top: 20, width: 360, height: 200 },
        1440,
        800,
      ),
    ).toEqual({ x: 720, y: 400 }));
  it("clamps regions to image bounds", () =>
    expect(
      clampRect({ x: -4, y: 95, width: 30, height: 20 }, 100, 100),
    ).toEqual({ x: 0, y: 95, width: 30, height: 5 }));
  it("keeps a valid region unchanged", () =>
    expect(
      clampRect({ x: 10, y: 10, width: 40, height: 30 }, 200, 200),
    ).toEqual({ x: 10, y: 10, width: 40, height: 30 }));
});
describe("privacy redactor validation", () => {
  it("accepts supported files", () =>
    expect(
      validateFile(new File(["x"], "x.png", { type: "image/png" })),
    ).toBeNull());
  it("rejects unsupported files", () =>
    expect(validateFile(new File(["x"], "x.gif", { type: "image/gif" }))).toBe(
      "unsupported-type",
    ));
  it("enforces dimensions", () => {
    expect(validDimensions(4000, 10000)).toBe(true);
    expect(validDimensions(4001, 10000)).toBe(false);
    expect(validDimensions(17000, 1)).toBe(false);
  });
});
