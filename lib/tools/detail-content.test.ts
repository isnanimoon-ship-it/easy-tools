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

  it("provides visible sections, 3-5 FAQs, and useful related links", () => {
    for (const [path, config] of Object.entries(TOOL_DETAIL_CONFIG)) {
      const content = TOOL_DETAIL_DATA.ko[path as DetailToolPath];
      expect(content?.sections.length).toBeGreaterThan(0);
      expect(content?.faqs.items.length).toBeGreaterThanOrEqual(3);
      expect(content?.faqs.items.length).toBeLessThanOrEqual(5);
      expect(config.related.length).toBeGreaterThanOrEqual(3);
      expect(config.related.length).toBeLessThanOrEqual(5);
      expect(config.related).not.toContain(path);
      expect(new Set(config.related).size).toBe(config.related.length);
      for (const relatedPath of config.related) {
        expect(PUBLIC_TOOLS.some((tool) => tool.path === relatedPath)).toBe(true);
      }
    }
  });

  it("keeps the deferred English and Japanese rollout limited to the initial three tools", () => {
    expect(Object.keys(TOOL_DETAIL_DATA.en)).toHaveLength(3);
    expect(Object.keys(TOOL_DETAIL_DATA.ja)).toHaveLength(3);
  });
});
