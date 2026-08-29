import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getBaseUrl } from "@/lib/site-url";
import { TOOLS } from "@/lib/tools/registry";

const paths = ["", ...TOOLS.map(tool => tool.path)] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  return paths.flatMap(path => routing.locales.map(locale => ({
    url: new URL(`/${locale}${path}`, baseUrl).href,
    lastModified: new Date("2026-08-29T00:00:00+09:00"),
    changeFrequency: path ? "monthly" as const : "weekly" as const,
    priority: path ? 0.8 : 1,
    alternates: { languages: { ...Object.fromEntries(routing.locales.map(item => [item, new URL(`/${item}${path}`, baseUrl).href])), "x-default": new URL(`/ko${path}`, baseUrl).href } },
  })));
}
