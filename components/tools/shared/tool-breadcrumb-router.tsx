"use client";

import { useLocale, useTranslations } from "next-intl";

import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/navigation/breadcrumb";
import { usePathname } from "@/i18n/navigation";
import { PUBLIC_TOOLS } from "@/lib/tools/registry";

const INLINE_BREADCRUMB_PATHS = new Set([
  "/tools/json-formatter",
  "/tools/markdown-viewer",
  "/tools/image-compressor",
  "/tools/image-metadata-remover",
  "/tools/image-to-pdf",
  "/tools/hwp-hwpx-viewer",
  "/tools/word-counter",
  "/tools/korean-keyboard-converter",
  "/tools/image-watermark",
  "/tools/animated-gif-maker",
]);

export function ToolBreadcrumbRouter() {
  const pathname = usePathname();
  const locale = useLocale();
  const common = useTranslations("Common");
  const home = useTranslations("Home.tools");
  const tool = PUBLIC_TOOLS.find((item) => item.path === pathname);
  if (locale === "ja" || !tool || INLINE_BREADCRUMB_PATHS.has(pathname)) return null;

  return <div className="border-b border-[var(--border)] bg-[var(--surface)]"><Container className="py-4"><Breadcrumb locale={locale} homeLabel={common("homeLabel")} category={{ key: tool.category, label: common(`toolsNav.categories.${tool.category}`) }} tool={{ path: tool.path, label: home(`${tool.translationKey}.title`) }} /></Container></div>;
}
