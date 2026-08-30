import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { clampCrop, cropRect } from "./crop";
import { contrastRatio, hexToRgb, isLowContrast } from "./contrast";
import { buildIco } from "./ico";
import { buildHtmlSnippet, buildManifest, buildZipFilename, resolveSiteName } from "./manifest";
import { buildZip, textToBytes } from "./package";
import { FAVICON_PRESETS } from "./presets";
import { fitTextFontSize } from "./render";
import { validateFile, validDimensions } from "./validation";
import type { CropState } from "./types";

describe("FAVICON_PRESETS — IDEAS.md #16 quick-start gallery", () => {
  it("clears the same low-contrast threshold used for manual color pickers", () => {
    for (const preset of FAVICON_PRESETS) {
      expect(isLowContrast(preset.background, preset.foreground), `${preset.id} background/foreground`).toBe(false);
    }
  });
  it("has unique ids", () => {
    expect(new Set(FAVICON_PRESETS.map((preset) => preset.id)).size).toBe(FAVICON_PRESETS.length);
  });
  it("keeps radius within the 0-0.5 range the UI slider allows", () => {
    for (const preset of FAVICON_PRESETS) expect(preset.radius).toBeGreaterThanOrEqual(0);
    for (const preset of FAVICON_PRESETS) expect(preset.radius).toBeLessThanOrEqual(0.5);
  });
  it("provides at least 6 presets as the SPEC calls for", () => {
    expect(FAVICON_PRESETS.length).toBeGreaterThanOrEqual(6);
  });
});

describe("cropRect — SPEC decision 4 (preview-independent normalized coordinates)", () => {
  const square = { width: 100, height: 100 };
  const wide = { width: 200, height: 100 };

  it("selects the full image at zoom 1 with no pan on a square image", () => {
    expect(cropRect(square, { zoom: 1, panX: 0, panY: 0 })).toEqual({ sx: 0, sy: 0, sw: 100, sh: 100 });
  });

  it("centers a square frame matching the short side on a wide image", () => {
    expect(cropRect(wide, { zoom: 1, panX: 0, panY: 0 })).toEqual({ sx: 50, sy: 0, sw: 100, sh: 100 });
  });

  it("halves the frame size at zoom 2", () => {
    const rect = cropRect(square, { zoom: 2, panX: 0, panY: 0 });
    expect(rect.sw).toBe(50);
    expect(rect.sh).toBe(50);
    expect(rect.sx).toBe(25);
    expect(rect.sy).toBe(25);
  });

  it("pans to the right edge at panX = 1 on a wide image", () => {
    const rect = cropRect(wide, { zoom: 1, panX: 1, panY: 0 });
    expect(rect.sx).toBe(100); // rightmost possible position for a 100-wide frame in a 200-wide image
  });

  it("pans to the left edge at panX = -1 on a wide image", () => {
    const rect = cropRect(wide, { zoom: 1, panX: -1, panY: 0 });
    expect(rect.sx).toBe(0);
  });

  it("never allows panning beyond the image bounds even with out-of-range input", () => {
    const rect = cropRect(wide, { zoom: 1, panX: 5, panY: 0 });
    expect(rect.sx).toBe(100); // clamped to the same max as panX = 1
  });

  it("clamps zoom below 1 up to 1 (never shows less than the short side)", () => {
    const rect = cropRect(square, { zoom: 0.2, panX: 0, panY: 0 });
    expect(rect.sw).toBe(100);
  });

  it("produces the exact same rectangle regardless of any notion of preview size", () => {
    // The function never takes a preview-size argument at all — this test
    // documents that guarantee by calling it identically twice.
    const a = cropRect(wide, { zoom: 1.5, panX: 0.3, panY: -0.2 });
    const b = cropRect(wide, { zoom: 1.5, panX: 0.3, panY: -0.2 });
    expect(a).toEqual(b);
  });
});

describe("clampCrop", () => {
  it("clamps zoom and pan into their valid ranges", () => {
    const state: CropState = { zoom: 10, panX: 3, panY: -3 };
    expect(clampCrop(state, 1, 4)).toEqual({ zoom: 4, panX: 1, panY: -1 });
  });
});

describe("contrast — SPEC section 17 (WCAG relative luminance)", () => {
  it("parses 3-digit and 6-digit hex identically", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
  });
  it("gives the maximum ratio (21:1) for black on white", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
  });
  it("gives a ratio of 1 for identical colors", () => {
    expect(contrastRatio("#5B8DEF", "#5B8DEF")).toBeCloseTo(1, 5);
  });
  it("flags near-identical colors as low contrast", () => {
    expect(isLowContrast("#ffffff", "#f5f5f5")).toBe(true);
  });
  it("does not flag black on white as low contrast", () => {
    expect(isLowContrast("#ffffff", "#000000")).toBe(false);
  });
});

describe("buildIco — SPEC decision 1 (PNG-in-ICO container)", () => {
  it("writes a correct ICONDIR header and per-entry ICONDIRENTRY fields", () => {
    const png16 = new Uint8Array([1, 2, 3, 4]);
    const png32 = new Uint8Array([5, 6, 7, 8, 9]);
    const ico = buildIco([
      { size: 16, png: png16 },
      { size: 32, png: png32 },
    ]);
    const view = new DataView(ico.buffer);

    expect(view.getUint16(0, true)).toBe(0); // reserved
    expect(view.getUint16(2, true)).toBe(1); // type: icon
    expect(view.getUint16(4, true)).toBe(2); // count

    // Entry 1 (16x16)
    expect(view.getUint8(6)).toBe(16); // width
    expect(view.getUint8(7)).toBe(16); // height
    expect(view.getUint16(10, true)).toBe(1); // planes
    expect(view.getUint16(12, true)).toBe(32); // bit count
    expect(view.getUint32(14, true)).toBe(4); // bytes in resource
    const offset1 = view.getUint32(18, true);
    expect(offset1).toBe(6 + 16 * 2); // right after the header

    // Entry 2 (32x32)
    expect(view.getUint8(22)).toBe(32);
    expect(view.getUint32(30, true)).toBe(5);
    const offset2 = view.getUint32(34, true);
    expect(offset2).toBe(offset1 + 4);

    // Actual PNG bytes land exactly at their declared offsets.
    expect(Array.from(ico.slice(offset1, offset1 + 4))).toEqual([1, 2, 3, 4]);
    expect(Array.from(ico.slice(offset2, offset2 + 5))).toEqual([5, 6, 7, 8, 9]);
    expect(ico.byteLength).toBe(offset2 + 5);
  });

  it("encodes a 256px entry's width/height byte as 0 (ICO convention)", () => {
    const ico = buildIco([{ size: 256, png: new Uint8Array([1]) }]);
    const view = new DataView(ico.buffer);
    expect(view.getUint8(6)).toBe(0);
    expect(view.getUint8(7)).toBe(0);
  });
});

describe("manifest — SPEC decision 7/8", () => {
  it("falls back to a generic name when the site name is empty", () => {
    expect(resolveSiteName("")).toBe("My Website");
    expect(resolveSiteName("   ")).toBe("My Website");
  });
  it("keeps a short site name for both name and short_name", () => {
    const manifest = JSON.parse(buildManifest({ siteName: "Coddy", themeColor: "#5B8DEF" }));
    expect(manifest.name).toBe("Coddy");
    expect(manifest.short_name).toBe("Coddy");
  });
  it("truncates short_name to 12 characters for a long site name", () => {
    const manifest = JSON.parse(buildManifest({ siteName: "A Very Long Website Name", themeColor: "#000000" }));
    expect(manifest.short_name).toBe("A Very Long ");
    expect(manifest.short_name.length).toBe(12);
  });
  it("always includes exactly the 192 and 512 android-chrome icons", () => {
    const manifest = JSON.parse(buildManifest({ siteName: "X", themeColor: "#000000" }));
    expect(manifest.icons).toEqual([
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ]);
  });
  it("derives theme_color and background_color from the same input color", () => {
    const manifest = JSON.parse(buildManifest({ siteName: "X", themeColor: "#123456" }));
    expect(manifest.theme_color).toBe("#123456");
    expect(manifest.background_color).toBe("#123456");
  });
  it("fixes display to standalone", () => {
    const manifest = JSON.parse(buildManifest({ siteName: "X", themeColor: "#000000" }));
    expect(manifest.display).toBe("standalone");
  });

  it("omits the application-name meta tag when the site name is empty", () => {
    const html = buildHtmlSnippet({ siteName: "", themeColor: "#000000" });
    expect(html).not.toContain("application-name");
  });
  it("includes the application-name meta tag when a site name is given", () => {
    const html = buildHtmlSnippet({ siteName: "Coddy", themeColor: "#000000" });
    expect(html).toContain('<meta name="application-name" content="Coddy" />');
  });
  it("always includes the required link tags and theme-color", () => {
    const html = buildHtmlSnippet({ siteName: "X", themeColor: "#5B8DEF" });
    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="any" />');
    expect(html).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />');
    expect(html).toContain('<link rel="manifest" href="/site.webmanifest" />');
    expect(html).toContain('<meta name="theme-color" content="#5B8DEF" />');
  });
  it("escapes HTML-significant characters in the site name so the snippet stays well-formed", () => {
    const html = buildHtmlSnippet({ siteName: 'My "Cool" <Site>', themeColor: "#000000" });
    expect(html).toContain('content="My &quot;Cool&quot; &lt;Site&gt;"');
    expect(html).not.toContain('content="My "Cool" <Site>"');
  });

  it("builds a slugified zip filename from the site name", () => {
    expect(buildZipFilename("Coddy")).toBe("coddy-favicon-package.zip");
    expect(buildZipFilename("My Cool Site!")).toBe("my-cool-site-favicon-package.zip");
  });
  it("falls back to a generic zip filename when the site name is empty", () => {
    expect(buildZipFilename("")).toBe("favicon-package.zip");
    expect(buildZipFilename("   ")).toBe("favicon-package.zip");
  });
});

describe("buildZip — SPEC decision 6 (fflate STORE mode, must round-trip)", () => {
  it("produces an archive that unzips back to the exact original file contents", () => {
    const files = [
      { name: "favicon.ico", data: new Uint8Array([1, 2, 3]) },
      { name: "site.webmanifest", data: textToBytes('{"name":"Test"}') },
      { name: "README.txt", data: textToBytes("hello world") },
    ];
    const zip = buildZip(files);
    const unzipped = unzipSync(zip);
    expect(Array.from(unzipped["favicon.ico"])).toEqual([1, 2, 3]);
    expect(strFromU8(unzipped["site.webmanifest"])).toBe('{"name":"Test"}');
    expect(strFromU8(unzipped["README.txt"])).toBe("hello world");
    expect(Object.keys(unzipped).sort()).toEqual(["README.txt", "favicon.ico", "site.webmanifest"]);
  });
});

describe("fitTextFontSize — SPEC decision 3", () => {
  function mockCtx(widthPerPxPerChar: number) {
    let currentFontSize = 0;
    return {
      set font(value: string) {
        const match = /(\d+(?:\.\d+)?)px/.exec(value);
        currentFontSize = match ? Number(match[1]) : 0;
      },
      get font() {
        return `${currentFontSize}px`;
      },
      measureText(text: string) {
        return { width: currentFontSize * widthPerPxPerChar * text.length } as TextMetrics;
      },
    };
  }

  it("shrinks the font size until the text fits within the safe width", () => {
    // widthPerPxPerChar chosen so the initial guess overflows and must shrink.
    const ctx = mockCtx(1.2);
    const fontSize = fitTextFontSize(ctx, "AB", 100, false);
    expect(ctx.measureText("AB").width).toBeLessThanOrEqual(100 * 0.82 + 1);
    expect(fontSize).toBeGreaterThan(0);
  });

  it("never shrinks below the minimum font size floor", () => {
    // An absurdly wide-per-character metric forces the loop to hit the floor.
    const ctx = mockCtx(50);
    const fontSize = fitTextFontSize(ctx, "WWW", 100, false);
    expect(fontSize).toBe(Math.floor(100 * 0.2));
  });

  it("does not shrink at all when the text already fits comfortably", () => {
    const ctx = mockCtx(0.01);
    const fontSize = fitTextFontSize(ctx, "A", 100, false);
    expect(fontSize).toBe(Math.floor(100 * 0.66));
  });
});

describe("validation — reused from privacy-redactor's established limits", () => {
  it("accepts supported image types under the size limit", () => {
    expect(validateFile(new File(["x"], "x.png", { type: "image/png" }))).toBeNull();
  });
  it("rejects unsupported types", () => {
    expect(validateFile(new File(["x"], "x.gif", { type: "image/gif" }))).toBe("unsupported-type");
  });
  it("enforces dimension and megapixel limits", () => {
    expect(validDimensions(4000, 4000)).toBe(true);
    expect(validDimensions(17000, 1)).toBe(false);
    expect(validDimensions(7000, 7000)).toBe(false); // 49MP > 40MP cap
  });
  // isAnimatedWebp reads bytes via Blob.slice().arrayBuffer(), which jsdom's
  // Blob does not implement — same reason privacy-redactor's own equivalent
  // is only covered by its real-browser QA script, not a unit test here.
});
