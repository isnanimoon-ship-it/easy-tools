import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { FEATURED_TOOLS, USE_CASES } from "@/lib/home/ko-content";

describe("Phase 4 trust assertions", () => {
  it("keeps homepage claims aligned with manual-only and top-only tools", () => {
    expect(FEATURED_TOOLS.find(item => item.path === "/tools/screenshot-statusbar-remover")?.description).not.toContain("하단");
    expect(USE_CASES.find(item => item.path === "/tools/privacy-redactor")?.description).not.toContain("자동 탐지");
  });

  it("publishes an ads.txt entry matching the configured AdSense publisher", () => {
    const layout = readFileSync("app/[locale]/layout.tsx", "utf8");
    const ads = readFileSync("public/ads.txt", "utf8").trim();
    expect(layout).toContain("ca-pub-7746620546474816");
    expect(ads).toBe("google.com, pub-7746620546474816, DIRECT, f08c47fec0942fa0");
  });
});
