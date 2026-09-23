"use client";

import { ArrowRight, CheckCircle2, Laptop, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/container";
import { GuideCard } from "@/components/guides/guide-card";
import { Link } from "@/i18n/navigation";
import { GUIDES } from "@/lib/content/guides";
import { DEVELOPER_PATHS, FEATURED_TOOLS, USE_CASES, WORK_GROUPS } from "@/lib/home/ko-content";
import { homeToolsForLocale, type ToolPath } from "@/lib/tools/registry";

const HOME_TOOLS = homeToolsForLocale("ko");
const TOOL_MAP = new Map(HOME_TOOLS.map(tool => [tool.path, tool]));

export function KoreanHome({ popularRanking }: { popularRanking: React.ReactNode }) {
  const t = useTranslations("Home");
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("ko");
  const results = useMemo(() => normalized ? HOME_TOOLS.filter(tool => `${t(`tools.${tool.translationKey}.title`)} ${t(`tools.${tool.translationKey}.description`)}`.toLocaleLowerCase("ko").includes(normalized)) : [], [normalized, t]);

  return <>
    <section className="border-b border-[var(--border)] bg-[var(--surface)]">
      <Container className="py-12 sm:py-20">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)] lg:gap-10">
          <div className="max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--info-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--primary)]"><Sparkles aria-hidden size={16}/>Konly 실용 도구</div>
          <h1 className="whitespace-pre-line text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-6xl">업무 중 잠깐 필요한 작업을{`\n`}설치 없이, 브라우저에서 해결하세요</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--text-muted)] sm:text-lg sm:leading-8">HWP 문서 확인부터 스크린샷 정리, 개인정보 가리기, 이미지 편집까지. 가능한 작업은 파일을 외부 서버에 맡기지 않고 브라우저 안에서 처리합니다.</p>
          <div className="mt-7 flex flex-wrap gap-3"><a href="#work-tools" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--primary-fill)] px-5 py-3 font-bold text-white focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]">도구 찾아보기<ArrowRight aria-hidden size={18}/></a><a href="#privacy-tools" className="inline-flex min-h-12 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 font-bold text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]">개인정보 보호 도구 보기</a></div>
          <p className="mt-6 font-semibold text-[var(--foreground)]">설치 없이 · 회원가입 없이 · 브라우저 중심 처리</p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">도구마다 파일 처리 방식과 지원 범위를 명확하게 안내합니다.</p>
          </div>
          {popularRanking}
        </div>
      </Container>
    </section>

    <HomeSection id="difference" title="단순히 도구를 모아놓은 사이트가 아닙니다" description="Konly는 업무와 일상에서 반복적으로 생기는 작은 불편을 빠르게 해결하기 위해 만든 웹 도구 모음입니다.">
      <p className="max-w-4xl leading-7 text-[var(--text-muted)]">문서 하나를 확인하기 위해 프로그램을 설치하거나, 스크린샷 몇 장을 정리하기 위해 편집 프로그램을 실행하고, 개인정보를 지우기 위해 사진을 외부 서비스에 업로드하는 과정을 줄이는 것이 목표입니다. 가능한 작업은 사용자의 브라우저 안에서 처리하고, 지원 범위와 제한사항은 각 도구 페이지에서 투명하게 안내합니다.</p>
      <div className="mt-7 grid gap-4 md:grid-cols-3">{[
        [Laptop, "브라우저에서 처리", "가능한 작업은 파일을 외부 서버로 보내지 않고 사용자의 브라우저 안에서 처리합니다."],
        [CheckCircle2, "실제 업무에서 필요한 기능", "문서 확인, 스크린샷 정리, 개인정보 제거처럼 실제 작업 과정에서 자주 필요한 기능을 중심으로 만듭니다."],
        [ShieldCheck, "지원 범위를 명확하게", "모든 파일과 환경에서 완벽하다고 표현하지 않고, 직접 확인한 범위와 제한사항을 함께 안내합니다."],
      ].map(([Icon, title, body]) => <InfoCard key={String(title)} icon={Icon as typeof Laptop} title={String(title)} body={String(body)}/>)}</div>
    </HomeSection>

    <HomeSection id="featured-tools" title="처음 방문했다면 이 도구부터 사용해보세요" description="Konly의 특징을 가장 잘 보여주는 대표 기능입니다." muted>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{FEATURED_TOOLS.map(item => <FeaturedCard key={item.path} {...item}/>)}</div>
    </HomeSection>

    <section aria-labelledby="tool-search-heading" className="border-b border-[var(--border)]">
      <Container className="py-10 sm:py-12">
        <h2 id="tool-search-heading" className="text-2xl font-bold text-[var(--foreground)]">필요한 도구 검색</h2>
        <p className="mt-2 text-[var(--text-muted)]">도구 이름이나 하려는 작업을 입력하세요.</p>
        <div className="relative mt-5 max-w-3xl"><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="예: HWP, 개인정보, 스크린샷, 이미지 압축" aria-label="도구 검색" className="min-h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-4 pr-12 text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)] [&::-webkit-search-cancel-button]:appearance-none"/>{query ? <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기" className="absolute inset-y-0 right-1 grid w-11 place-items-center text-[var(--text-muted)]"><X aria-hidden size={19}/></button> : <Search aria-hidden size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>}</div>
        {normalized ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{results.length ? results.map(tool => <SimpleToolLink key={tool.path} path={tool.path}/>) : <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-[var(--text-muted)]">일치하는 도구가 없습니다. 다른 검색어를 입력해 보세요.</p>}</div> : null}
      </Container>
    </section>

    <HomeSection id="work-tools" title="지금 하려는 작업에 맞는 도구를 찾아보세요" description="도구 이름보다 지금 해결하려는 작업을 기준으로 묶었습니다.">
      <div className="grid gap-4 md:grid-cols-2">{WORK_GROUPS.map((group, index) => <WorkGroup key={group.title} {...group} id={index === 2 ? "privacy-tools" : undefined}/>)}</div>
    </HomeSection>

    <HomeSection id="processing-principles" title={<>파일을 올리기 전에,<br/>어디에서 처리되는지 확인해보세요</>} description="온라인 도구를 사용할 때 파일이 어디로 전송되는지는 중요한 문제입니다." muted>
      <p className="max-w-3xl leading-7 text-[var(--text-muted)]">Konly는 가능한 기능을 사용자의 브라우저 안에서 처리하는 것을 기본 원칙으로 삼고 있습니다. 서버 통신이 필요한 기능은 해당 도구에서 별도로 안내하며, 자동 탐지나 변환 결과는 공유하기 전에 직접 확인하도록 권장합니다.</p>
      <div className="mt-7 grid gap-4 md:grid-cols-3"><InfoCard icon={Laptop} title="가능한 작업은 브라우저에서" body="이미지·텍스트처럼 브라우저에서 처리할 수 있는 작업은 사용자 기기 안에서 처리하는 방식을 우선합니다."/><InfoCard icon={ShieldCheck} title="처리 방식을 숨기지 않습니다" body="서버 통신이나 외부 조회가 필요한 기능은 각 도구 페이지에서 별도로 안내합니다."/><InfoCard icon={CheckCircle2} title="민감한 파일은 직접 확인하세요" body="자동 결과가 항상 완벽할 수는 없습니다. 개인정보가 포함된 자료는 최종 결과를 확인한 뒤 공유하세요."/></div>
      <Link href="/privacy" className="mt-6 inline-flex items-center gap-2 font-bold text-[var(--primary)]">파일 처리 원칙 자세히 보기<ArrowRight aria-hidden size={17}/></Link>
    </HomeSection>

    <HomeSection id="use-cases" title="이런 상황을 해결하기 위해 만들었습니다" description="실제 업무와 일상에서 반복되는 작업을 기준으로 도구를 선택해 보세요.">
      <div className="grid gap-4 md:grid-cols-2">{USE_CASES.map(item => <article key={item.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h3 className="text-lg font-bold text-[var(--foreground)]">{item.title}</h3><p className="mt-2 leading-6 text-[var(--text-muted)]">{item.description}</p><Link href={item.path} className="mt-4 inline-flex items-center gap-2 font-bold text-[var(--primary)]">{item.cta}<ArrowRight aria-hidden size={16}/></Link></article>)}</div>
    </HomeSection>

    <HomeSection id="developer-tools" title="개발 중 잠깐 필요한 도구도 준비되어 있습니다" description="Konly의 중심은 업무·문서·이미지 도구지만, 개발 과정의 간단한 확인 작업도 빠르게 처리할 수 있습니다." muted>
      <div className="flex flex-wrap gap-3">{DEVELOPER_PATHS.map(path => <SimpleToolLink key={path} path={path}/>)}</div>
    </HomeSection>

    <HomeSection id="guides" title={<>도구만 제공하지 않고<br/>안전하게 사용하는 방법도 함께 정리합니다</>} description="실제 파일과 화면을 공유할 때 놓치기 쉬운 부분을 작업 상황별로 확인해 보세요." muted>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{GUIDES.map(guide => <GuideCard key={guide.slug} guide={guide}/>)}</div>
      <Link href="/guides" className="mt-6 inline-flex items-center gap-2 font-bold text-[var(--primary)]">전체 활용 가이드 보기<ArrowRight aria-hidden size={17}/></Link>
    </HomeSection>

    <HomeSection id="philosophy" title="직접 필요해서 만들고, 직접 확인하며 개선합니다" description="Konly는 실제 웹 개발과 업무 과정에서 반복적으로 겪었던 작은 불편을 줄이기 위해 시작한 개인 운영 서비스입니다.">
      <div className="grid gap-5 md:grid-cols-2"><p className="leading-7 text-[var(--text-muted)]">문서 하나를 확인하기 위해 별도 프로그램을 설치하거나, 간단한 이미지 작업 때문에 무거운 편집 프로그램을 실행해야 하는 상황을 줄이는 것이 목표입니다.</p><p className="leading-7 text-[var(--text-muted)]">새 기능을 무작정 늘리기보다 실제로 도움이 되는지, 브라우저에서 안전하게 처리할 수 있는지, 사용 방법과 제한사항을 충분히 설명할 수 있는지 확인하며 도구를 추가합니다.</p></div>
      <Link href="/about" className="mt-6 inline-flex items-center gap-2 font-bold text-[var(--primary)]">Konly 소개와 운영 원칙<ArrowRight aria-hidden size={17}/></Link>
    </HomeSection>

    <HomeSection id="verification" title="만들고 끝내지 않고 계속 확인합니다" description="브라우저 환경과 파일 형식은 계속 바뀝니다." muted><p className="max-w-3xl leading-7 text-[var(--text-muted)]">오류 제보와 실제 사용 과정에서 확인된 문제를 바탕으로 지원 범위와 사용 방법을 지속적으로 수정합니다.</p><Link href="/contact" className="mt-5 inline-flex items-center gap-2 font-bold text-[var(--primary)]">오류 또는 개선 의견 보내기<ArrowRight aria-hidden size={17}/></Link></HomeSection>

    <section className="border-t border-[var(--border)]"><Container className="py-12 text-center sm:py-16"><h2 className="text-3xl font-bold text-[var(--foreground)]">지금 필요한 작업부터 시작해보세요</h2><p className="mx-auto mt-3 max-w-2xl text-[var(--text-muted)]">회원가입이나 프로그램 설치 없이 필요한 도구를 바로 사용할 수 있습니다.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><a href="#work-tools" className="rounded-xl bg-[var(--primary-fill)] px-5 py-3 font-bold text-white">전체 도구 보기</a><a href="#privacy-tools" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 font-bold text-[var(--foreground)]">개인정보 보호 도구</a></div></Container></section>
  </>;
}

function HomeSection({ id, title, description, muted = false, children }: { id: string; title: React.ReactNode; description: string; muted?: boolean; children: React.ReactNode }) { return <section id={id} aria-labelledby={`${id}-heading`} className={muted ? "border-y border-[var(--border)] bg-[var(--surface-muted)]" : undefined}><Container className="scroll-mt-20 py-12 sm:py-16"><h2 id={`${id}-heading`} className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">{title}</h2><p className="mt-3 max-w-3xl leading-7 text-[var(--text-muted)]">{description}</p><div className="mt-7">{children}</div></Container></section>; }

function toolFor(path: ToolPath) { const tool = TOOL_MAP.get(path); if (!tool) throw new Error(`Unknown tool path: ${path}`); return tool; }

function FeaturedCard(item: (typeof FEATURED_TOOLS)[number]) { const t = useTranslations("Home"); const tool = toolFor(item.path); const Icon = tool.icon; return <Link href={item.path} className="group flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:border-[var(--info-border)] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"><span className="grid size-11 place-items-center rounded-xl bg-[var(--info-bg)] text-[var(--primary)]"><Icon aria-hidden size={22}/></span><h3 className="mt-4 text-xl font-bold text-[var(--foreground)]">{t(`tools.${tool.translationKey}.title`)}</h3><p className="mt-2 leading-6 text-[var(--text-muted)]">{item.description}</p><ul className="mt-4 flex flex-wrap gap-2" aria-label="주요 사용 상황">{item.contexts.map(context => <li key={context} className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">{context}</li>)}</ul><span className="mt-auto inline-flex items-center gap-2 pt-5 font-bold text-[var(--primary)]">{item.cta}<ArrowRight aria-hidden size={16} className="transition-transform group-hover:translate-x-1"/></span></Link>; }

function WorkGroup({ title, description, paths, cta, id }: (typeof WORK_GROUPS)[number] & { id?: string }) { return <article id={id} className="scroll-mt-20 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h3 className="text-xl font-bold text-[var(--foreground)]">{title}</h3><p className="mt-2 leading-6 text-[var(--text-muted)]">{description}</p><div className="mt-4 flex flex-wrap gap-2">{paths.map(path => <SimpleToolLink key={path} path={path}/>)}</div><p className="mt-4 text-sm font-bold text-[var(--primary)]">{cta}</p></article>; }

function SimpleToolLink({ path }: { path: ToolPath }) { const t = useTranslations("Home"); const tool = toolFor(path); const Icon = tool.icon; return <Link href={path} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--info-border)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"><Icon aria-hidden size={17} className="text-[var(--primary)]"/>{t(`tools.${tool.translationKey}.title`)}</Link>; }

function InfoCard({ icon: Icon, title, body }: { icon: typeof Laptop; title: string; body: string }) { return <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><Icon aria-hidden className="text-[var(--primary)]" size={22}/><h3 className="mt-3 font-bold text-[var(--foreground)]">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{body}</p></article>; }
