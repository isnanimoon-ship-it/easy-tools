import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "About.metadata" });

  return createPageMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    pathname: `/${locale}/about`,
  });
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("About");

  if (locale === "ko") return <KoreanAbout/>;

  return (
    <>
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container className="py-10 sm:py-14">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{t("title")}</h1>
            <p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{t("intro")}</p>
          </div>
        </Container>
      </section>

      <Container className="max-w-3xl space-y-6 py-8 sm:py-12">
        {(["service", "access", "browser", "improvement"] as const).map((section) => (
          <InfoSection key={section} title={t(`sections.${section}.title`)}>
            {t(`sections.${section}.body`)}
          </InfoSection>
        ))}

        <section className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 sm:p-6">
          <h2 className="text-xl font-bold text-[var(--info-fg)]">{t("contact.title")}</h2>
          <p className="mt-3 leading-7 text-[var(--info-fg)]">{t("contact.body")}</p>
          <Link href="/contact" className="mt-4 inline-flex font-bold text-[var(--info-fg)] hover:underline">
            {t("contact.link")}
          </Link>
        </section>
      </Container>
    </>
  );
}

function KoreanAbout() {
  const principles = [
    ["가능한 작업은 브라우저에서 처리", "사용자의 파일을 외부 서버로 전송하지 않아도 되는 작업은 브라우저 내부 처리를 우선합니다."],
    ["처리 방식을 명확하게 안내", "서버 통신이나 외부 조회가 필요한 기능은 숨기지 않고 해당 도구 페이지에서 안내합니다."],
    ["지원 범위를 과장하지 않음", "모든 파일 지원이나 완벽한 자동 처리처럼 확인할 수 없는 표현을 사용하지 않습니다."],
    ["제한사항도 기능의 일부로 안내", "도구가 잘 작동하지 않을 수 있는 조건과 최종 확인이 필요한 부분도 함께 설명합니다."],
    ["실제 사용자가 이해할 수 있는 설명", "구현 기술보다 사용자가 언제, 왜 사용하고 무엇을 확인해야 하는지 먼저 설명합니다."],
    ["도구 수를 억지로 늘리지 않음", "실제 작업에 도움이 되는지 확인하고 기존 기능을 점검·개선하는 일을 함께 진행합니다."],
  ];
  return <><section className="border-b border-[var(--border)] bg-[var(--surface)]"><Container className="py-10 sm:py-14"><div className="max-w-4xl"><h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">Konly를 만든 이유</h1><p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">Konly는 실제 웹 개발과 업무 과정에서 반복적으로 생기는 작은 작업을 조금 더 간단하게 처리하기 위해 만든 개인 운영 웹 도구 서비스입니다.</p></div></Container></section><Container className="max-w-4xl space-y-12 py-10 sm:py-14"><section><h2 className="text-2xl font-bold text-[var(--foreground)]">왜 이런 도구를 만들었나요?</h2><div className="mt-4 grid gap-3 leading-8 text-[var(--text-muted)]"><p>문서 하나를 확인하기 위해 프로그램을 설치하거나, 간단한 이미지 작업을 위해 별도 편집 프로그램을 실행하고, 파일을 처리하기 위해 낯선 외부 서비스에 업로드해야 하는 번거로움을 줄이는 것이 목표입니다.</p><p>HWP 파일을 잠깐 확인하거나, 여러 장의 스크린샷을 한 장으로 정리하거나, 공유할 이미지에서 개인정보를 가리고 사진에 남은 위치정보를 확인하는 도구를 하나씩 직접 추가하고 개선하고 있습니다.</p></div></section><section><h2 className="text-2xl font-bold text-[var(--foreground)]">Konly 운영 원칙</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{principles.map(([title, body], index) => <article key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><span className="text-sm font-bold text-[var(--primary)]">원칙 {index + 1}</span><h3 className="mt-2 font-bold text-[var(--foreground)]">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{body}</p></article>)}</div></section><section className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 sm:p-7"><h2 className="text-xl font-bold text-[var(--info-fg)]">파일과 데이터는 어떻게 처리하나요?</h2><div className="mt-3 grid gap-3 leading-7 text-[var(--info-fg)]"><p>이미지·텍스트 변환처럼 가능한 작업은 브라우저에서 처리합니다. IP 조회처럼 외부 통신이 필요한 기능은 해당 페이지에 전송 대상과 목적을 표시합니다.</p><p>사이트 이용 통계와 인기 도구 집계를 위한 제한된 정보, 광고와 쿠키 사용에 관한 내용은 개인정보처리방침에서 확인할 수 있습니다.</p></div><Link href="/privacy" className="mt-4 inline-flex font-bold text-[var(--primary)] hover:underline">파일 처리와 개인정보 정책 보기 →</Link></section><section><h2 className="text-2xl font-bold text-[var(--foreground)]">운영 기록과 사용 가이드</h2><div className="mt-5 grid gap-4 sm:grid-cols-3"><AboutLink href="/guides" title="활용 가이드" text="실제 작업 상황에서 무엇을 확인해야 하는지 정리합니다."/><AboutLink href="/updates" title="업데이트" text="실제로 적용한 기능과 안내 변경사항을 기록합니다."/><AboutLink href="/contact" title="문의·오류 제보" text="도구 오류나 지원되지 않는 조건을 알려주세요."/></div></section></Container></>;
}

function AboutLink({ href, title, text }: { href: "/guides" | "/updates" | "/contact"; title: string; text: string }) { return <Link href={href} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h3 className="font-bold text-[var(--foreground)]">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{text}</p><span className="mt-3 inline-block font-bold text-[var(--primary)]">자세히 보기 →</span></Link>; }

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-[var(--foreground)]">{title}</h2>
      <p className="mt-3 leading-7 text-[var(--text-muted)]">{children}</p>
    </section>
  );
}
