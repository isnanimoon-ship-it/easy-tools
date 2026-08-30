import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { NaverWcs } from "@/components/analytics/naver-wcs";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { getBaseUrl } from "@/lib/site-url";
import { localizedAlternates, siteName } from "@/lib/seo";
import { THEME_BOOTSTRAP } from "@/lib/theme";
import { routing, type AppLocale } from "@/i18n/routing";

import "../globals.css";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });
  const typedLocale = locale as AppLocale;

  return {
    metadataBase: getBaseUrl(),
    title: {
      default: t("title"),
      template: `%s | ${t("title")}`,
    },
    description: t("description"),
    applicationName: siteName(typedLocale),
    icons: {
      icon: "/site-icon.svg",
    },
    alternates: {
      canonical: `/${locale}`,
      languages: localizedAlternates(`/${locale}`),
    },
    openGraph: { title: t("title"), description: t("description"), url: `/${locale}`, siteName: siteName(typedLocale), locale: typedLocale === "ko" ? "ko_KR" : typedLocale === "ja" ? "ja_JP" : "en_US", type: "website", images: [{ url: "/og", width: 1200, height: 630, alt: `${siteName(typedLocale)} · KONLY` }] },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description"), images: ["/og"] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const baseUrl = getBaseUrl();
  const jsonLd = { "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", "@id": `${baseUrl.origin}/#website`, url: baseUrl.origin, name: siteName(locale as AppLocale), alternateName: "KONLY", inLanguage: routing.locales, description: messages.Metadata.description }, { "@type": "WebApplication", "@id": `${baseUrl.origin}/#webapp`, url: baseUrl.origin, name: siteName(locale as AppLocale), description: messages.Metadata.description, applicationCategory: "UtilitiesApplication", operatingSystem: "Any", browserRequirements: "Requires a modern web browser", inLanguage: routing.locales, isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" } }] };

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html:THEME_BOOTSTRAP}}/>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7746620546474816" crossOrigin="anonymous"/>
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}/>
        <NaverWcs />
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
