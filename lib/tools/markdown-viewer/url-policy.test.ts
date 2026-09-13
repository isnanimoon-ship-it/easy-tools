import { describe, expect, it } from "vitest";
import { classifyMarkdownLink } from "./url-policy";

describe("Markdown URL policy", () => {
  it("allows HTTP, HTTPS, mail, and fragments", () => {
    expect(classifyMarkdownLink("https://example.com/a").kind).toBe("external");
    expect(classifyMarkdownLink("http://example.com").kind).toBe("external");
    expect(classifyMarkdownLink("mailto:help@example.com").kind).toBe("external");
    expect(classifyMarkdownLink("#section")).toEqual({ kind: "fragment", href: "#section" });
  });
  it("blocks active, data, relative, and malformed URLs", () => {
    for (const value of ["javascript:alert(1)", "data:text/html,x", "vbscript:x", "./secret", "/local", "not a url"]) expect(classifyMarkdownLink(value)).toEqual({ kind: "blocked" });
  });
});
