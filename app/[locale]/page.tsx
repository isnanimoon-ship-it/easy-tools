import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { Container } from "@/components/layout/container";
import { KoreanHome } from "@/components/home/korean-home";
import { PopularRankingWidget } from "@/components/home/popular-ranking-widget";
import { ToolDiscovery } from "@/components/home/tool-discovery";
import type { AppLocale } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

// 인기 랭킹 위젯이 읽는 tool_popularity는 pg_cron이 5분마다 갱신한다 — 그 주기에 맞춰
// 홈페이지를 ISR로 재생성해서 매 요청마다 Supabase를 조회하지 않도록 한다.
export const revalidate = 300;

type HomeProps = {
  params: Promise<{ locale: AppLocale }>;
};

export async function generateMetadata({ params }: HomeProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "ko") return {};
  const title = "브라우저에서 바로 쓰는 무료 업무 도구 | Konly";
  const description = "HWP·HWPX 문서 확인, 스크린샷 이어붙이기, 개인정보 가리기, 사진 메타데이터 삭제 등 업무와 일상에 필요한 도구를 설치 없이 사용할 수 있습니다. 가능한 작업은 브라우저에서 처리합니다.";
  const metadata = createPageMetadata({ locale, title, description, pathname: "/ko" });
  return { ...metadata, title: { absolute: title } };
}

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return locale === "ko" ? <KoreanHome /> : <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("Home");

  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container className="py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--info-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--primary)]">
              <Sparkles aria-hidden="true" size={16} />
              {t("eyebrow")}
            </div>
            <h1 className="whitespace-pre-line text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">
              {t("description")}
            </p>
          </div>
        </Container>
      </section>

      <ToolDiscovery popularRanking={<PopularRankingWidget />} />
    </>
  );
}
