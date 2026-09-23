"use client";

import { ArrowRight, Search, ShieldCheck, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Link } from "@/i18n/navigation";
import {
  homeToolsForLocale,
  TOOL_CATEGORY_KEYS,
  toolsInCategory,
  type ToolCategoryKey,
  type ToolPath,
} from "@/lib/tools/registry";
import type { AppLocale } from "@/i18n/routing";

const EXTRA_KEYWORDS: Partial<Record<ToolPath, string>> = {
  "/tools/word-counter": "글자 문자 단어 줄 count character word text 文字 文字数",
  "/tools/json-formatter": "json beautify pretty minify 개발 데이터 整形 圧縮",
  "/tools/password-generator": "비밀번호 암호 password passphrase パスワード",
  "/tools/base64-converter": "base64 encode decode 인코딩 디코딩 エンコード デコード",
  "/tools/url-encoder-decoder": "url uri percent query encode decode 주소 링크",
  "/tools/youtube-thumbnail-downloader": "youtube 유튜브 썸네일 thumbnail download サムネイル",
  "/tools/qr-code-generator": "qr qrcode 큐알 생성 generator 作成",
  "/tools/ip-info": "ip address network isp asn 인터넷 주소 ネットワーク",
  "/tools/image-color-picker": "색상 컬러 color hex rgb pixel palette ピクセル",
  "/tools/image-compressor": "이미지 사진 압축 용량 줄이기 compress jpg png webp",
  "/tools/screenshot-stitcher": "스크린샷 캡처 이어붙이기 merge stitch long image",
  "/tools/regex-tester": "regex regexp 정규식 match replace test",
  "/tools/cron-expression-generator": "cron crontab schedule 스케줄 표현식",
  "/tools/privacy-redactor": "개인정보 가리기 마스킹 blur redact screenshot",
  "/tools/screenshot-statusbar-remover": "상태바 제거 crop screenshot status bar",
  "/tools/text-cleaner": "텍스트 공백 빈줄 중복 정리 clean whitespace duplicate",
  "/tools/korean-initial-converter": "한글 초성 자음 변환 korean initial consonant",
  "/tools/jwt-decoder": "jwt token header payload decode 토큰",
  "/tools/favicon-generator": "favicon icon ico 파비콘 아이콘 generator",
  "/tools/sql-formatter": "sql query format minify 쿼리 포맷 정렬",
  "/tools/excel-chart-maker": "excel csv chart graph 엑셀 그래프 차트 xlsx",
};

export function ToolDiscovery({ popularRanking }: { popularRanking: React.ReactNode }) {
  const t = useTranslations("Home");
  const locale = useLocale() as AppLocale;
  const homeTools = useMemo(() => homeToolsForLocale(locale), [locale]);
  const nav = useTranslations("Common.toolsNav");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategoryKey | null>(null);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleTools = useMemo(
    () => homeTools.filter((tool) => {
      if (category && tool.category !== category) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        t(`tools.${tool.translationKey}.title`),
        t(`tools.${tool.translationKey}.description`),
        nav(`categories.${tool.category}`),
        EXTRA_KEYWORDS[tool.path] ?? "",
      ].join(" ").toLocaleLowerCase();
      return haystack.includes(normalizedQuery);
    }),
    [category, homeTools, nav, normalizedQuery, t],
  );

  const recentTools = [...homeTools].sort((a, b) => b.homeOrder - a.homeOrder).slice(0, 4);

  function selectCategory(nextCategory: ToolCategoryKey | null) {
    setCategory(nextCategory);
    document.querySelector("#all-tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <section aria-labelledby="search-heading" className="border-b border-[var(--border)]">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="text-center">
            <h2 id="search-heading" className="text-2xl font-bold text-[var(--foreground)]">{t("search.title")}</h2>
            <p className="mt-2 text-[var(--text-muted)]">{t("search.description")}</p>
          </div>
          <div className="relative mt-6">
            {!query ? <span style={{ inset: "0 0 0 auto" }} className="pointer-events-none absolute flex w-12 items-center justify-center text-[var(--text-muted)]"><Search aria-hidden="true" size={21} /></span> : null}
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (event.target.value) setCategory(null);
              }}
              placeholder={t("search.placeholder")}
              aria-label={t("search.label")}
              className="min-h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-4 pr-12 text-base text-[var(--foreground)] shadow-sm outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
            {query ? <span style={{ inset: "0 0.5rem 0 auto" }} className="absolute flex items-center"><button type="button" onClick={() => setQuery("")} aria-label={t("search.clear")} className="grid size-10 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"><X aria-hidden="true" size={19} /></button></span> : null}
          </div>
        </div>
      </section>

      {normalizedQuery ? (
        <HomeSection id="search-results" title={t("search.resultsTitle")} description={t("search.results", { count: visibleTools.length })}>
          {visibleTools.length ? <div className="grid gap-4 md:grid-cols-2">{visibleTools.map((tool) => <ToolCard key={tool.path} tool={tool} />)}</div> : <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-6 py-12 text-center"><p className="font-bold text-[var(--foreground)]">{t("search.emptyTitle")}</p><p className="mt-2 text-[var(--text-muted)]">{t("search.emptyDescription")}</p><button type="button" onClick={() => { setQuery(""); setCategory(null); }} className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-semibold text-[var(--foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]">{t("search.reset")}</button></div>}
        </HomeSection>
      ) : (
        <>
      <HomeSection id="popular-tools" title={t("popular.title")} description={t("popular.description")}>
        {popularRanking}
      </HomeSection>

      <HomeSection id="categories" title={t("categories.title")} description={t("categories.description")} muted>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {TOOL_CATEGORY_KEYS.map((key) => {
            const tools = toolsInCategory(key, locale);
            const Icon = tools[0].icon;
            return <button key={key} type="button" onClick={() => selectCategory(key)} className="group min-h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-sm transition hover:border-[var(--info-border)] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"><span className="grid size-10 place-items-center rounded-xl bg-[var(--info-bg)] text-[var(--primary)]"><Icon aria-hidden="true" size={20} /></span><span className="mt-4 block font-bold text-[var(--foreground)]">{nav(`categories.${key}`)}</span><span className="mt-1 block text-sm text-[var(--text-muted)]">{t("categories.count", { count: tools.length })}</span></button>;
          })}
        </div>
      </HomeSection>

      <HomeSection id="all-tools" title={t("tools.title")} description={t("tools.description")}>
        <div className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" aria-label={t("categories.filterLabel")}>
              <FilterButton active={category === null} onClick={() => setCategory(null)}>{t("categories.all")}</FilterButton>
              {TOOL_CATEGORY_KEYS.map((key) => <FilterButton key={key} active={category === key} onClick={() => setCategory(key)}>{nav(`categories.${key}`)}</FilterButton>)}
            </div>
            <p className="text-sm font-semibold text-[var(--text-muted)]">{t("search.results", { count: visibleTools.length })}</p>
          </div>
          {visibleTools.length ? <div className="grid gap-4 md:grid-cols-2">{visibleTools.map((tool) => <ToolCard key={tool.path} tool={tool} />)}</div> : <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-6 py-12 text-center"><p className="font-bold text-[var(--foreground)]">{t("search.emptyTitle")}</p><p className="mt-2 text-[var(--text-muted)]">{t("search.emptyDescription")}</p><button type="button" onClick={() => { setQuery(""); setCategory(null); }} className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-semibold text-[var(--foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]">{t("search.reset")}</button></div>}
        </div>
      </HomeSection>

      <HomeSection id="recent-tools" title={t("recent.title")} description={t("recent.description")} muted>
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{recentTools.map((tool) => <ToolCard key={tool.path} tool={tool} compact />)}</div>
          <div className="grid gap-4 md:grid-cols-3">
            {["free", "private", "accessible"].map((key) => <div key={key} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><ShieldCheck aria-hidden="true" className="text-[var(--primary)]" size={22} /><h3 className="mt-3 font-bold text-[var(--foreground)]">{t(`service.${key}.title`)}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t(`service.${key}.description`)}</p></div>)}
          </div>
        </div>
      </HomeSection>
        </>
      )}
    </>
  );
}

function HomeSection({ id, title, description, muted = false, children }: { id: string; title: string; description: string; muted?: boolean; children: React.ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-heading`} className={muted ? "border-y border-[var(--border)] bg-[var(--surface-muted)]" : undefined}><div className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8"><h2 id={`${id}-heading`} className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">{title}</h2><p className="mt-2 max-w-2xl leading-7 text-[var(--text-muted)]">{description}</p><div className="mt-7">{children}</div></div></section>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-10 rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] ${active ? "border-[var(--primary-fill)] bg-[var(--primary-fill)] text-white" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]"}`}>{children}</button>;
}

export function ToolCard({ tool, compact = false }: { tool: ReturnType<typeof homeToolsForLocale>[number]; compact?: boolean }) {
  const t = useTranslations("Home");
  const Icon = tool.icon;
  return <Link href={tool.path} className={`group block rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:border-[var(--info-border)] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] ${compact ? "p-5" : "p-6"}`}><span className="grid size-11 place-items-center rounded-xl bg-[var(--info-bg)] text-[var(--primary)]"><Icon aria-hidden="true" size={22} /></span><h3 className={`${compact ? "mt-4 text-lg" : "mt-5 text-xl"} font-bold text-[var(--foreground)]`}>{t(`tools.${tool.translationKey}.title`)}</h3><p className="mt-2 line-clamp-2 leading-6 text-[var(--text-muted)]">{t(`tools.${tool.translationKey}.description`)}</p><span className="mt-4 inline-flex items-center gap-2 font-semibold text-[var(--primary)]">{t("tools.open")}<ArrowRight aria-hidden="true" size={17} className="transition-transform group-hover:translate-x-1" /></span></Link>;
}
