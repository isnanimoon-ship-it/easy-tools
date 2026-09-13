"use client";

import { useLocale } from "next-intl";

import { Container } from "@/components/layout/container";
import { usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { ToolDetailContent } from "@/components/tools/shared/tool-detail-content";
import { TOOL_DETAIL_CONFIG, type DetailToolPath } from "@/lib/tools/detail-content";

const INLINE_DETAIL_PATHS = new Set<DetailToolPath>([
  "/tools/json-formatter",
  "/tools/markdown-viewer",
  "/tools/image-compressor",
  "/tools/image-metadata-remover",
  "/tools/image-to-pdf",
  "/tools/hwp-hwpx-viewer",
  "/tools/word-counter",
]);

export function ToolDetailRouter() {
  const pathname = usePathname();
  const locale = useLocale() as AppLocale;
  if (locale === "ja" || !(pathname in TOOL_DETAIL_CONFIG) || INLINE_DETAIL_PATHS.has(pathname as DetailToolPath)) return null;

  return <Container className="pb-12 sm:pb-16"><ToolDetailContent toolPath={pathname as DetailToolPath} locale={locale} /></Container>;
}
