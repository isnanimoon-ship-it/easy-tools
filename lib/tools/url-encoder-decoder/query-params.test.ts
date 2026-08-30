import { describe, expect, it } from "vitest";

import { buildQueryOutput, parseQueryInput } from "./query-params";

describe("parseQueryInput", () => {
  it("returns an empty result for blank input", () => {
    expect(parseQueryInput("")).toEqual({ base: null, params: [] });
    expect(parseQueryInput("   ")).toEqual({ base: null, params: [] });
  });

  it("splits a full URL into its base and ordered query parameters", () => {
    expect(parseQueryInput("https://example.com/search?q=hello&page=2")).toEqual({
      base: "https://example.com/search",
      params: [
        { key: "q", value: "hello" },
        { key: "page", value: "2" },
      ],
    });
  });

  it("keeps the base with no params when the URL has no query string", () => {
    expect(parseQueryInput("https://example.com/path")).toEqual({
      base: "https://example.com/path",
      params: [],
    });
  });

  it("parses a bare query string with no base URL", () => {
    expect(parseQueryInput("q=hello&page=2")).toEqual({
      base: null,
      params: [
        { key: "q", value: "hello" },
        { key: "page", value: "2" },
      ],
    });
  });

  it("accepts a bare query string with a leading question mark", () => {
    expect(parseQueryInput("?q=hello")).toEqual({
      base: null,
      params: [{ key: "q", value: "hello" }],
    });
  });

  it("preserves duplicate keys as separate entries in document order", () => {
    expect(parseQueryInput("tag=a&tag=b&tag=c").params).toEqual([
      { key: "tag", value: "a" },
      { key: "tag", value: "b" },
      { key: "tag", value: "c" },
    ]);
  });

  it("decodes percent-encoding and treats + as a space", () => {
    expect(parseQueryInput("q=hello+world&name=%EC%95%88%EB%85%95").params).toEqual([
      { key: "q", value: "hello world" },
      { key: "name", value: "안녕" },
    ]);
  });

  it("normalizes the hostname but keeps the path case in the base", () => {
    expect(parseQueryInput("https://EXAMPLE.com/Search?q=1").base).toBe("https://example.com/Search");
  });

  it("treats a single bare word as one key with an empty value", () => {
    expect(parseQueryInput("hello")).toEqual({ base: null, params: [{ key: "hello", value: "" }] });
  });
});

describe("buildQueryOutput", () => {
  it("returns an empty string for no base and no params", () => {
    expect(buildQueryOutput(null, [])).toBe("");
  });

  it("joins base and encoded params with a question mark", () => {
    expect(buildQueryOutput("https://example.com/search", [{ key: "q", value: "hello world" }])).toBe(
      "https://example.com/search?q=hello+world",
    );
  });

  it("returns the base unchanged when there are no params", () => {
    expect(buildQueryOutput("https://example.com/path", [])).toBe("https://example.com/path");
  });

  it("returns a bare query string when there is no base", () => {
    expect(buildQueryOutput(null, [{ key: "a", value: "1" }, { key: "b", value: "2" }])).toBe("a=1&b=2");
  });

  it("skips rows with an empty key but keeps rows with an empty value", () => {
    expect(
      buildQueryOutput(null, [
        { key: "", value: "ignored" },
        { key: "flag", value: "" },
      ]),
    ).toBe("flag=");
  });

  it("percent-encodes special characters in keys and values", () => {
    expect(buildQueryOutput(null, [{ key: "a&b", value: "x=y&z" }])).toBe("a%26b=x%3Dy%26z");
  });

  it("preserves duplicate keys as repeated pairs", () => {
    expect(
      buildQueryOutput(null, [
        { key: "tag", value: "a" },
        { key: "tag", value: "b" },
      ]),
    ).toBe("tag=a&tag=b");
  });

  it("round-trips a parsed URL back to an equivalent query string", () => {
    const source = "https://example.com/search?q=hello+world&page=2";
    const { base, params } = parseQueryInput(source);
    expect(buildQueryOutput(base, params)).toBe(source);
  });
});
