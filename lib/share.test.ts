import { describe, expect, it } from "vitest";
import { isShareablePath, publicPageUrl, xShareUrl } from "./share";

describe("site page sharing", () => {
  it("shares the page path without query or fragment state", () => {
    expect(publicPageUrl("https://www.konly.co.kr", "/ko/tools/json-formatter")).toBe("https://www.konly.co.kr/ko/tools/json-formatter");
  });
  it("encodes X intent parameters without changing the source URL", () => {
    const result = new URL(xShareUrl("https://www.konly.co.kr/ko", "이미지 & PDF"));
    expect(result.searchParams.get("url")).toBe("https://www.konly.co.kr/ko");
    expect(result.searchParams.get("text")).toBe("이미지 & PDF");
  });
  it("does not expose one-time transfer sessions or hidden transfer tools", () => {
    expect(isShareablePath("/t/secret-session")).toBe(false);
    expect(isShareablePath("/tools/p2p-file-transfer")).toBe(false);
    expect(isShareablePath("/tools/image-to-pdf")).toBe(true);
    expect(isShareablePath("/")).toBe(true);
  });
});
