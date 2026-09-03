import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { createPageMetadata, localizedAlternates } from "./seo";
import { routing } from "@/i18n/routing";
import { PUBLIC_TOOLS } from "@/lib/tools/registry";

describe("SEO metadata", () => {
  it("creates reciprocal locale and x-default alternates", () => {
    expect(localizedAlternates("/en/tools/word-counter")).toEqual({ ko:"/ko/tools/word-counter", en:"/en/tools/word-counter", ja:"/ja/tools/word-counter", "x-default":"/ko/tools/word-counter" });
  });
  it("creates page-specific social and crawler metadata", () => {
    const metadata=createPageMetadata({locale:"ko",title:"글자수 계산기",description:"설명",pathname:"/ko/tools/word-counter"});
    expect(metadata.alternates?.canonical).toBe("/ko/tools/word-counter");
    expect(metadata.openGraph).toMatchObject({title:"글자수 계산기",url:"/ko/tools/word-counter",locale:"ko_KR",type:"website"});
    expect(metadata.twitter).toMatchObject({card:"summary_large_image",title:"글자수 계산기"});
    expect(metadata.robots).toMatchObject({index:true,follow:true});
  });
  it("lists every locale and tool exactly once in the sitemap", () => {
    const entries=sitemap(); const expectedPaths=["","/privacy","/contact",...PUBLIC_TOOLS.map(tool=>tool.path)];
    expect(entries).toHaveLength(expectedPaths.length*routing.locales.length); expect(new Set(entries.map(entry=>entry.url)).size).toBe(entries.length);
    for(const path of expectedPaths) for(const locale of routing.locales) expect(entries.some(entry=>entry.url===`https://www.konly.co.kr/${locale}${path}`)).toBe(true);
    expect(entries.every(entry=>entry.url.startsWith("https://www.konly.co.kr/"))).toBe(true);
    expect(entries.find(entry=>entry.url.endsWith("/en/tools/json-formatter"))?.alternates?.languages?.["x-default"]).toBe("https://www.konly.co.kr/ko/tools/json-formatter");
  });
  it("publishes the production sitemap through robots", () => {
    expect(robots()).toEqual({rules:{userAgent:"*",allow:"/"},sitemap:"https://www.konly.co.kr/sitemap.xml",host:"https://www.konly.co.kr"});
  });
});
