import { describe, expect, it } from "vitest";

import { PUBLIC_TOOLS } from "@/lib/tools/registry";
import { REPRESENTATIVE_TOOL_DETAILS } from "@/lib/tools/representative-detail-data";

const paths = [
  "/tools/hwp-hwpx-viewer",
  "/tools/privacy-redactor",
  "/tools/screenshot-stitcher",
  "/tools/image-metadata-remover",
  "/tools/screenshot-statusbar-remover",
  "/tools/excel-chart-maker",
] as const;

describe("representative tool detail data", () => {
  it("covers all six representative pages with useful FAQs and related tools", () => {
    expect(Object.keys(REPRESENTATIVE_TOOL_DETAILS)).toEqual(paths);
    for (const path of paths) {
      const content = REPRESENTATIVE_TOOL_DETAILS[path];
      expect(content.facts.length).toBeGreaterThanOrEqual(4);
      expect(content.blocks.length).toBeGreaterThanOrEqual(4);
      expect(content.faqs.length).toBeGreaterThanOrEqual(3);
      expect(content.faqs.length).toBeLessThanOrEqual(5);
      expect(content.related.length).toBeGreaterThanOrEqual(3);
      for (const related of content.related) {
        expect(PUBLIC_TOOLS.some((tool) => tool.path === related)).toBe(true);
        expect(related).not.toBe(path);
      }
    }
  });

  it("keeps safety-critical descriptions aligned with the implementation", () => {
    const redactor = JSON.stringify(REPRESENTATIVE_TOOL_DETAILS["/tools/privacy-redactor"]);
    expect(redactor).toContain("자동으로 찾지 않습니다");
    expect(redactor).toContain("직접 가릴 영역을 추가");

    const statusbar = JSON.stringify(REPRESENTATIVE_TOOL_DETAILS["/tools/screenshot-statusbar-remover"]);
    expect(statusbar).toContain("현재는 상단만 제거합니다");
    expect(statusbar).toContain("하단 홈 인디케이터");

    const hwp = JSON.stringify(REPRESENTATIVE_TOOL_DETAILS["/tools/hwp-hwpx-viewer"]);
    expect(hwp).toContain("읽기 전용");
    expect(hwp).toContain("공식 프로그램");
  });

  it("uses a different section composition for each workflow", () => {
    const signatures = paths.map((path) => REPRESENTATIVE_TOOL_DETAILS[path].blocks.map((block) => block.type).join(","));
    expect(new Set(signatures).size).toBe(paths.length);
  });
});
