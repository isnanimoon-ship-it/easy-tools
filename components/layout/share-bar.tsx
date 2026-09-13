"use client";

import { useEffect, useState } from "react";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/container";
import { usePathname } from "@/i18n/navigation";
import { prepareKakaoShare, shareWithKakao } from "@/lib/kakao-share";
import { isShareablePath, publicPageUrl, xShareUrl } from "@/lib/share";

const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

/** Tool pages that render their detail content (and share bar) inline instead of via ToolDetailRouter. */
const INLINE_DETAIL_PATHS = new Set([
  "/tools/json-formatter",
  "/tools/markdown-viewer",
  "/tools/image-compressor",
  "/tools/image-metadata-remover",
  "/tools/image-to-pdf",
  "/tools/hwp-hwpx-viewer",
  "/tools/word-counter",
]);

function currentTarget() {
  return {
    url: publicPageUrl(window.location.origin, window.location.pathname),
    title: document.querySelector("main h1")?.textContent?.trim() || document.title,
  };
}

export function ShareBar() {
  const pathname = usePathname();
  if (!isShareablePath(pathname) || INLINE_DETAIL_PATHS.has(pathname)) return null;
  return <ShareBarContent key={pathname} />;
}

/** Used by tool pages that place their detail content inline, right after the tool itself. */
export function InlineShareBar() {
  return <ShareBarContent />;
}

function ShareBarContent() {
  const t = useTranslations("Common.share");
  const [kakaoReady, setKakaoReady] = useState(false);
  const [status, setStatus] = useState("");
  const [manualUrl, setManualUrl] = useState("");

  useEffect(() => {
    if (!kakaoKey) return;
    let active = true;
    void prepareKakaoShare()
      .then(() => { if (active) setKakaoReady(true); })
      .catch(() => { if (active) setStatus(t("kakaoLoadFailed")); });
    return () => { active = false; };
  }, [t]);

  async function copyLink() {
    const { url } = currentTarget();
    try {
      await navigator.clipboard.writeText(url);
      setManualUrl("");
      setStatus(t("copied"));
    } catch {
      setManualUrl(url);
      setStatus(t("copyFailed"));
    }
  }

  async function shareOther() {
    if (!navigator.share) { setStatus(t("nativeUnavailable")); return; }
    const { url, title } = currentTarget();
    try { await navigator.share({ title, url }); setStatus(""); }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setStatus(t("shareFailed")); }
  }

  async function shareKakao() {
    if (!kakaoKey || !kakaoReady) return;
    const { url, title } = currentTarget();
    try { await shareWithKakao(kakaoKey, url, title); setStatus(""); }
    catch { setStatus(t("kakaoFailed")); }
  }

  function shareX() {
    const { url, title } = currentTarget();
    window.open(xShareUrl(url, title), "_blank", "noopener,noreferrer");
  }

  return <Container className="py-7 sm:py-9">
    <section aria-label={t("label")} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <h2 className="mr-1 text-sm font-bold text-[var(--text-muted)]">{t("label")}</h2>
        <button type="button" onClick={shareX} className={buttonClass}><span aria-hidden="true" className="text-lg leading-none">𝕏</span>{t("x")}</button>
        <button type="button" onClick={() => void shareKakao()} disabled={!kakaoReady} title={!kakaoKey ? t("kakaoSetup") : !kakaoReady ? t("kakaoLoading") : undefined} className={buttonClass}><MessageCircle aria-hidden size={17}/>{t("kakao")}</button>
        <button type="button" onClick={() => void copyLink()} className={buttonClass}><Copy aria-hidden size={17}/>{t("copy")}</button>
        <button type="button" onClick={() => void shareOther()} className={buttonClass}><Share2 aria-hidden size={17}/>{t("more")}</button>
      </div>
      {status ? <p role="status" className="mt-3 text-sm text-[var(--text-muted)]">{status}</p> : null}
      {manualUrl ? <input aria-label={t("manualCopy")} readOnly value={manualUrl} onFocus={event => event.currentTarget.select()} className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-sm"/> : null}
    </section>
  </Container>;
}
