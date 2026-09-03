import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_TOOLS, PUBLIC_TOOLS, TOOL_CATEGORY_KEYS, TOOLS } from "./registry";

describe("tool registry", () => {
  it("registers every tool route exactly once", () => {
    const routeNames = readdirSync(resolve(process.cwd(), "app/[locale]/tools"), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => `/tools/${entry.name}`)
      .sort();
    const registeredPaths = TOOLS.map(tool => tool.path).sort();

    expect(new Set(registeredPaths).size).toBe(TOOLS.length);
    expect(registeredPaths).toEqual(routeNames);
  });

  it("has valid categories, unique ordering, and translations for every locale", () => {
    for (const category of TOOL_CATEGORY_KEYS) {
      const tools = TOOLS.filter(tool => tool.category === category);
      expect(new Set(tools.map(tool => tool.menuOrder)).size).toBe(tools.length);
    }
    expect(new Set(TOOLS.map(tool => tool.homeOrder)).size).toBe(TOOLS.length);

    for (const locale of ["ko", "en", "ja"]) {
      const messages = JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), "utf8"));
      for (const tool of TOOLS) {
        expect(messages.Common.toolsNav[tool.translationKey]).toBeTruthy();
        expect(messages.Home.tools[tool.translationKey]?.title).toBeTruthy();
        expect(messages.Home.tools[tool.translationKey]?.description).toBeTruthy();
      }
    }
  });

  it("keeps hidden tools directly routable but out of public discovery", () => {
    expect(TOOLS.some(tool => tool.path === "/tools/p2p-file-transfer")).toBe(true);
    expect(PUBLIC_TOOLS.some(tool => tool.path === "/tools/p2p-file-transfer")).toBe(false);
    expect(HOME_TOOLS.some(tool => tool.path === "/tools/p2p-file-transfer")).toBe(false);
  });
});
