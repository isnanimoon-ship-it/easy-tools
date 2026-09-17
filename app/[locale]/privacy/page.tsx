import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Privacy.metadata" });
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname: `/${locale}/privacy` });
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");
  const thirdPartyItems = t.raw("sections.thirdParty.items") as string[];

  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container className="py-10 sm:py-14">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{t("title")}</h1>
            <p className="mt-4 text-sm text-[var(--text-muted)]">{t("lastUpdated")}</p>
            <p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{t("intro")}</p>
          </div>
        </Container>
      </section>

      <Container className="max-w-3xl space-y-6 py-8 sm:py-12">
        <PolicySection title={t("sections.principle.title")}>
          <p>{t("sections.principle.body")}</p>
        </PolicySection>

        <PolicySection title={t("sections.dataCollected.title")}>
          <p>{t("sections.dataCollected.body")}</p>
        </PolicySection>

        <PolicySection title={t("sections.ads.title")}>
          <p>{t("sections.ads.body")}</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[var(--primary)]">
            <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
              {t("sections.ads.optOutLink")}
            </a>
            <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="hover:underline">
              {t("sections.ads.policyLink")}
            </a>
          </div>
        </PolicySection>

        <PolicySection title={t("sections.analytics.title")}>
          <p>{t("sections.analytics.body")}</p>
        </PolicySection>

        <PolicySection title={t("sections.thirdParty.title")}>
          <ul className="list-disc space-y-1 pl-5">
            {thirdPartyItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </PolicySection>

        <PolicySection title={t("sections.cookies.title")}>
          <p>{t("sections.cookies.body")}</p>
        </PolicySection>

        {locale === "ko" ? <>
          <PolicySection title="브라우저 저장 정보"><p>다크 모드 선택은 브라우저 localStorage에 저장되며, 언어 선택은 NEXT_LOCALE 쿠키에 저장됩니다. 도구에 입력한 텍스트나 선택한 파일을 작업 기록으로 localStorage에 저장하지 않습니다.</p></PolicySection>
          <PolicySection title="사용자 파일과 문의"><p>브라우저 처리로 안내된 도구의 파일은 해당 탭의 임시 메모리에서 처리되며 사이트 서버에 업로드하거나 보관하지 않습니다. 문의 페이지는 별도 서버 폼이 아니라 이용자의 이메일 프로그램을 여는 방식이며, 사이트가 입력 내용을 전송 전에 저장하지 않습니다. 문의 이메일을 보낼 때에는 개인정보가 포함된 원본 파일을 첨부하지 않는 것을 권장합니다.</p></PolicySection>
          <PolicySection title="서버 로그와 인기 도구 집계"><p>호스팅 환경은 보안과 장애 대응을 위한 일반적인 접속 로그를 처리할 수 있습니다. 도구 방문 시에는 인기 도구 집계를 위해 도구 식별자와 접속 시각, IP 주소·브라우저 정보·날짜를 단방향 변환한 방문자 식별값을 처리하며 원본 IP 주소는 집계 데이터에 저장하지 않습니다.</p></PolicySection>
        </> : null}

        <PolicySection title={t("sections.children.title")}>
          <p>{t("sections.children.body")}</p>
        </PolicySection>

        <PolicySection title={t("sections.changes.title")}>
          <p>{t("sections.changes.body")}</p>
        </PolicySection>

        <PolicySection title={t("sections.contact.title")}>
          <p>{t("sections.contact.body")}</p>
          <a href={`mailto:${t("sections.contact.email")}`} className="mt-2 inline-block font-semibold text-[var(--primary)] hover:underline">
            {t("sections.contact.email")}
          </a>
        </PolicySection>
      </Container>
    </>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-[var(--foreground)]">{title}</h2>
      <div className="mt-3 space-y-3 leading-7 text-[var(--text-muted)]">{children}</div>
    </section>
  );
}
