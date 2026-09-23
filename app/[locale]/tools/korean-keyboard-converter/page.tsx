import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InlineShareBar } from "@/components/layout/share-bar";
import { Container } from "@/components/layout/container";
import { KoreanKeyboardConverter } from "@/components/tools/korean-keyboard-converter/korean-keyboard-converter";
import { ToolPageHero } from "@/components/tools/shared/tool-page-hero";
import type { AppLocale } from "@/i18n/routing";
import { createKoreanPageMetadata } from "@/lib/seo";

const path = "/tools/korean-keyboard-converter" as const;
type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "ko") notFound();
  return createKoreanPageMetadata({
    title: "한글 오타(자판) 변환기",
    description: "한영 전환을 놓쳐 잘못 입력한 영문 자판을 한글로 되돌리거나 한글을 두벌식 영문 키로 변환합니다.",
    pathname: "/ko/tools/korean-keyboard-converter",
  });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (locale !== "ko") notFound();
  return <>
    <ToolPageHero locale="ko" title="한글 오타(자판) 변환기" description="한/영 전환을 깜빡하고 입력한 문장을 표준 두벌식 자판 기준으로 되돌립니다." homeLabel="간편도구 홈" category={{ key: "text", label: "텍스트" }} tool={{ path, label: "한글 오타(자판) 변환기" }}/>
    <Container className="py-8 sm:py-12">
      <KoreanKeyboardConverter />
      <InlineShareBar />
      <ToolGuide />
    </Container>
  </>;
}

function ToolGuide() {
  return <div className="mt-12 space-y-12 text-[var(--foreground)]">
    <section><h2 className="text-2xl font-bold">이 도구는 무엇을 하나요?</h2><p className="mt-4 max-w-4xl leading-7 text-[var(--text-muted)]">키보드가 영문 상태인 줄 모르고 입력한 <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5">dkssudgktpdy</code>를 <strong>안녕하세요</strong>로 복원합니다. 반대로 한글 문장을 같은 두벌식 키 위치의 영문 문자열로 바꾸는 것도 가능합니다.</p></section>
    <section><h2 className="text-2xl font-bold">사용 방법</h2><ol className="mt-5 grid gap-4 sm:grid-cols-3">{[["1", "방향 선택", "영문 자판→한글 또는 한글→영문 자판을 선택합니다."], ["2", "문장 입력", "잘못 입력한 문장을 붙여 넣으면 결과가 즉시 표시됩니다."], ["3", "결과 확인", "결과를 확인한 뒤 복사 버튼으로 필요한 곳에 붙여 넣습니다."]].map(([step, title, body]) => <li key={step} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><span className="text-sm font-bold text-[var(--primary)]">STEP {step}</span><h3 className="mt-2 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{body}</p></li>)}</ol></section>
    <section><h2 className="text-2xl font-bold">변환 기준과 제한사항</h2><ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-[var(--text-muted)]"><li>Windows와 macOS에서 널리 사용하는 표준 두벌식 한글 자판 배열을 기준으로 합니다.</li><li>쌍자음, 복합 모음, 겹받침과 받침 뒤에 이어지는 모음을 조합합니다.</li><li>자동 맞춤법 교정이나 문맥 추론은 하지 않습니다. 입력한 키 위치만 변환합니다.</li><li>세벌식, 모바일 천지인·나랏글 자판은 지원하지 않습니다.</li><li>숫자, 공백과 일반 기호는 가능한 한 원문 그대로 유지합니다.</li></ul></section>
    <section><h2 className="text-2xl font-bold">개인정보 및 처리 방식</h2><p className="mt-4 max-w-4xl leading-7 text-[var(--text-muted)]">변환은 브라우저의 JavaScript로 처리되며 입력 문장을 서버에 저장하거나 전송하지 않습니다. 민감한 문장도 네트워크 연결 없이 변환 로직 자체는 동작합니다.</p></section>
    <section><h2 className="text-2xl font-bold">자주 묻는 질문</h2><div className="mt-5 space-y-3">{[["영문을 입력했는데 예상과 다른 한글이 나옵니다.", "이 도구는 문맥이 아니라 두벌식 키 위치를 그대로 조합합니다. 원래 입력 당시 다른 자판 배열을 사용했다면 결과가 다를 수 있습니다."], ["대문자도 변환되나요?", "네. Shift가 적용되는 Q, W, E, R, T, O, P는 쌍자음 또는 ㅒ·ㅖ로 처리하고 나머지 영문 대문자는 같은 키의 소문자와 동일하게 처리합니다."], ["맞춤법도 고쳐주나요?", "아니요. 한/영 입력 상태 때문에 생긴 자판 오타만 되돌리며 띄어쓰기와 맞춤법은 별도로 교정하지 않습니다."], ["입력한 문장이 서버에 남나요?", "아니요. 모든 변환은 현재 브라우저 안에서 처리됩니다."]].map(([question, answer]) => <details key={question} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><summary className="cursor-pointer font-bold">{question}</summary><p className="mt-3 leading-7 text-[var(--text-muted)]">{answer}</p></details>)}</div></section>
  </div>;
}
