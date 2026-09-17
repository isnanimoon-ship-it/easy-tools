import { useLocale, useTranslations } from "next-intl";

import { Container } from "@/components/layout/container";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("Common");
  const about = useTranslations("About");
  const privacy = useTranslations("Privacy");
  const contact = useTranslations("Contact");
  const terms = useTranslations("Terms");
  const locale = useLocale();

  if (locale === "ko") return <footer className="border-t border-[var(--border)] bg-[var(--surface)]"><Container className="py-10 text-sm text-[var(--text-muted)]"><div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_1fr_1fr]"><div className="max-w-xl"><p className="font-bold text-[var(--foreground)]">Konly · 간편도구</p><p className="mt-2 leading-6">실제 업무의 작은 불편을 줄이기 위해 직접 만들고 점검하는 브라우저 기반 도구 서비스입니다.</p><p className="mt-4">{t("footer", { year: new Date().getFullYear() })}</p></div><FooterGroup title="서비스" links={[["/about", "서비스 소개·운영 원칙"], ["/guides", "활용 가이드"], ["/updates", "업데이트"], ["/contact", "문의·오류 제보"]]}/><FooterGroup title="정책과 도구" links={[["/privacy", "개인정보처리방침"], ["/terms", "이용약관"], ["/", "전체 도구"]]}/></div></Container></footer>;

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <Container className="py-8 text-sm text-[var(--text-muted)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-semibold text-[var(--foreground)]">{t("footer", { year: new Date().getFullYear() })}</p>
            <p className="mt-2 leading-6">{t("footerDescription")}</p>
          </div>
          <nav aria-label={t("footerNavLabel")} className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/about" className="font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] hover:underline">
              {about("title")}
            </Link>
            <Link href="/contact" className="font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] hover:underline">
              {contact("title")}
            </Link>
            <Link href="/privacy" className="font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] hover:underline">
              {privacy("title")}
            </Link>
            <Link href="/terms" className="font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] hover:underline">
              {terms("title")}
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: Array<["/" | "/about" | "/guides" | "/updates" | "/contact" | "/privacy" | "/terms", string]> }) { return <nav aria-label={title}><h2 className="font-bold text-[var(--foreground)]">{title}</h2><ul className="mt-3 grid gap-2">{links.map(([href, label]) => <li key={href}><Link href={href} className="hover:text-[var(--foreground)] hover:underline">{label}</Link></li>)}</ul></nav>; }
