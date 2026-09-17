import { describe, expect, it } from "vitest";

import { GUIDES, TOOL_GUIDES, guideBySlug } from "@/lib/content/guides";
import { SITE_UPDATES } from "@/lib/content/updates";
import { PUBLIC_TOOLS } from "@/lib/tools/registry";

describe("Phase 3 editorial content", () => {
  it("contains four focused guides with real dates, checklists and valid tools", () => {
    expect(GUIDES).toHaveLength(4);
    expect(new Set(GUIDES.map(guide => guide.slug)).size).toBe(4);
    for (const guide of GUIDES) {
      expect(guide.publishedAt).toBe("2026-09-18");
      expect(guide.sections.length).toBeGreaterThanOrEqual(4);
      expect(guide.sections.some(section => section.type === "checklist" || section.type === "steps")).toBe(true);
      expect(guide.relatedTools.length).toBeGreaterThan(0);
      expect(guideBySlug(guide.slug)).toBe(guide);
      for (const path of guide.relatedTools) expect(PUBLIC_TOOLS.some(tool => tool.path === path)).toBe(true);
    }
  });

  it("keeps tool-to-guide mappings valid and selective", () => {
    for (const [toolPath, slugs] of Object.entries(TOOL_GUIDES)) {
      expect(PUBLIC_TOOLS.some(tool => tool.path === toolPath)).toBe(true);
      expect(slugs.length).toBeLessThanOrEqual(3);
      for (const slug of slugs) expect(guideBySlug(slug)).toBeTruthy();
    }
  });

  it("records only the actual September 2026 work", () => {
    expect(SITE_UPDATES.length).toBeGreaterThan(0);
    for (const update of SITE_UPDATES) expect(update.date.startsWith("2026-09-")).toBe(true);
  });
});
