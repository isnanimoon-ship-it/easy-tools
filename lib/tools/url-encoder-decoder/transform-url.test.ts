import { describe, expect, it } from "vitest";

import { transformUrl, type UrlEncodingType } from "./transform-url";

function roundTrip(text: string, type: UrlEncodingType) {
  const encoded = transformUrl(text, "encode", type);
  expect(encoded.ok).toBe(true);
  if (!encoded.ok) return;
  expect(transformUrl(encoded.value, "decode", type)).toEqual({ ok: true, value: text });
}

describe("transformUrl", () => {
  it.each(["hello world", "안녕하세요", "こんにちは", "你好", "Hello 😀🚀", "e\u0301", "line 1\r\nline 2\tend"])(
    "round trips Unicode and whitespace: %s",
    (text) => {
      roundTrip(text, "component");
      roundTrip(text, "full-url");
    },
  );

  it("matches URL Component reserved-character behavior", () => {
    expect(transformUrl("https://example.com/search?q=안녕하세요&sort=new", "encode", "component")).toEqual({
      ok: true,
      value: "https%3A%2F%2Fexample.com%2Fsearch%3Fq%3D%EC%95%88%EB%85%95%ED%95%98%EC%84%B8%EC%9A%94%26sort%3Dnew",
    });
  });

  it("matches Full URL reserved-character behavior", () => {
    expect(transformUrl("https://example.com/search?q=안녕하세요&sort=new", "encode", "full-url")).toEqual({
      ok: true,
      value: "https://example.com/search?q=%EC%95%88%EB%85%95%ED%95%98%EC%84%B8%EC%9A%94&sort=new",
    });
  });

  it("uses the standard safe sets for special characters", () => {
    const input = "! @ # $ % ^ & * ( )";
    expect(transformUrl(input, "encode", "component")).toEqual({ ok: true, value: "!%20%40%20%23%20%24%20%25%20%5E%20%26%20*%20(%20)" });
    expect(transformUrl(input, "encode", "full-url")).toEqual({ ok: true, value: "!%20@%20#%20$%20%25%20%5E%20&%20*%20(%20)" });
  });

  it("double-encodes an existing escape and round trips it", () => {
    expect(transformUrl("hello%20world", "encode", "component")).toEqual({ ok: true, value: "hello%2520world" });
    roundTrip("hello%20world", "component");
  });

  it.each(["%", "%A", "%ZZ", "abc%2", "%FF", "%E0%A4", "%C0%AF", "%ED%A0%80"])(
    "rejects malformed or invalid UTF-8 escapes: %s",
    (input) => expect(transformUrl(input, "decode", "component")).toEqual({ ok: false, reason: "invalid-percent-encoding" }),
  );

  it("does not convert plus to a space", () => {
    expect(transformUrl("a+b%20c", "decode", "component")).toEqual({ ok: true, value: "a+b c" });
  });

  it("keeps escaped reserved characters in Full URL decode", () => {
    expect(transformUrl("a%2Fb%3Fc%3Dd%26e%2Bf", "decode", "full-url")).toEqual({ ok: true, value: "a%2Fb%3Fc%3Dd%26e%2Bf" });
    expect(transformUrl("a%2Fb%3Fc%3Dd%26e%2Bf", "decode", "component")).toEqual({ ok: true, value: "a/b?c=d&e+f" });
  });

  it("rejects lone surrogates without replacing them", () => {
    expect(transformUrl("\uD800", "encode", "component")).toEqual({ ok: false, reason: "invalid-unicode" });
    expect(transformUrl("\uDC00", "encode", "full-url")).toEqual({ ok: false, reason: "invalid-unicode" });
  });

  it("treats only a zero-length string as empty data", () => {
    expect(transformUrl("", "encode", "component")).toEqual({ ok: true, value: "" });
    expect(transformUrl(" \n", "encode", "component")).toEqual({ ok: true, value: "%20%0A" });
  });
});
