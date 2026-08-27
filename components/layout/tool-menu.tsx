"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, Grid2X2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

const tools = [
  ["/tools/word-counter", "wordCounter"],
  ["/tools/json-formatter", "jsonFormatter"],
  ["/tools/password-generator", "passwordGenerator"],
  ["/tools/base64-converter", "base64Converter"],
  ["/tools/url-encoder-decoder", "urlEncoderDecoder"],
  ["/tools/youtube-thumbnail-downloader", "youtubeThumbnailDownloader"],
  ["/tools/qr-code-generator", "qrCodeGenerator"],
  ["/tools/ip-info", "ipInfo"],
  ["/tools/image-color-picker", "imageColorPicker"],
] as const;

export function ToolMenu() {
  const t = useTranslations("Common.toolsNav");
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (detailsRef.current?.open && !detailsRef.current.contains(event.target as Node)) detailsRef.current.open = false;
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.open = false;
        detailsRef.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOnOutsideClick); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  return (
    <details ref={detailsRef} className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 [&::-webkit-details-marker]:hidden">
        <Grid2X2 aria-hidden="true" size={18} />
        <span>{t("open")}</span>
        <ChevronDown aria-hidden="true" size={16} className="transition-transform group-open:rotate-180" />
      </summary>

      <nav
        aria-label={t("label")}
        className="fixed left-4 right-4 top-[4.5rem] z-50 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:grid-cols-2 md:absolute md:left-1/2 md:right-auto md:top-14 md:w-[38rem] md:-translate-x-1/2"
      >
        <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{t("all")}</p>
        <div className="grid gap-1 sm:grid-cols-2">
          {tools.map(([href, key]) => (
            <Link
              key={href}
              href={href}
              onClick={() => { if (detailsRef.current) detailsRef.current.open = false; }}
              className="flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              {t(key)}
            </Link>
          ))}
        </div>
      </nav>
    </details>
  );
}
