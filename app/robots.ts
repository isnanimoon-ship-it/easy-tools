import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  return { rules: { userAgent: "*", allow: "/" }, sitemap: new URL("/sitemap.xml", baseUrl).href, host: baseUrl.origin };
}
