import type { Metadata } from "next";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

const siteNames: Record<AppLocale, string> = { ko: "간편도구", en: "Easy Tools", ja: "便利ツール" };
const ogLocales: Record<AppLocale, string> = { ko: "ko_KR", en: "en_US", ja: "ja_JP" };

export function localizedAlternates(pathname: string) {
  const suffix = pathname.replace(/^\/(ko|en|ja)/, "");
  return {
    ...Object.fromEntries(routing.locales.map(locale => [locale, `/${locale}${suffix}`])),
    "x-default": `/ko${suffix}`,
  };
}

export function createPageMetadata({ locale, title, description, pathname }:{ locale:AppLocale; title:string; description:string; pathname:string }): Metadata {
  const alternateLocale = routing.locales.filter(item => item !== locale).map(item => ogLocales[item]);
  return {
    title,
    description,
    alternates: { canonical: pathname, languages: localizedAlternates(pathname) },
    openGraph: { title, description, url: pathname, siteName: siteNames[locale], locale: ogLocales[locale], alternateLocale, type: "website", images: [{ url: "/og", width: 1200, height: 630, alt: `${siteNames[locale]} · KONLY` }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og"] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  };
}

export function siteName(locale: AppLocale) { return siteNames[locale]; }
