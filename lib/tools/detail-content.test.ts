import { describe, expect, it } from "vitest";

import { TOOL_DETAIL_CONFIG, type DetailToolPath } from "./detail-content";
import { TOOL_DETAIL_DATA } from "./detail-content-data";
import { PUBLIC_TOOLS } from "./registry";

describe("tool detail content", () => {
  it("covers every public Korean tool page", () => {
    const publicPaths = PUBLIC_TOOLS.map((tool) => tool.path).sort();
    const configuredPaths = Object.keys(TOOL_DETAIL_CONFIG).sort();
    const koreanPaths = Object.keys(TOOL_DETAIL_DATA.ko).sort();
    expect(configuredPaths).toEqual(publicPaths);
    expect(koreanPaths).toEqual(publicPaths);
  });

  it("provides Korean and English sections, 3-5 FAQs, privacy notes, and useful related links", () => {
    for (const [path, config] of Object.entries(TOOL_DETAIL_CONFIG)) {
      for (const locale of ["ko", "en"] as const) {
        const content = TOOL_DETAIL_DATA[locale][path as DetailToolPath];
        expect(content?.sections.length, `${locale}:${path}:sections`).toBeGreaterThan(0);
        expect(content?.faqs.items.length, `${locale}:${path}:faqs`).toBeGreaterThanOrEqual(3);
        expect(content?.faqs.items.length, `${locale}:${path}:faqs`).toBeLessThanOrEqual(5);
        if (locale === "en") expect(content?.privacy, `${locale}:${path}:privacy`).toBeTruthy();
      }
      expect(config.related.length).toBeGreaterThanOrEqual(3);
      expect(config.related.length).toBeLessThanOrEqual(5);
      expect(config.related).not.toContain(path);
      expect(new Set(config.related).size).toBe(config.related.length);
      for (const relatedPath of config.related) {
        expect(PUBLIC_TOOLS.some((tool) => tool.path === relatedPath)).toBe(true);
      }
    }
  });

  it("covers every English tool while keeping Japanese limited to the initial three", () => {
    expect(Object.keys(TOOL_DETAIL_DATA.en).sort()).toEqual(PUBLIC_TOOLS.map((tool) => tool.path).sort());
    expect(Object.keys(TOOL_DETAIL_DATA.ja)).toHaveLength(3);
  });
});
