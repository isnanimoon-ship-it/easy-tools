"use client";

import { useMemo, useState } from "react";

import { PUBLIC_TOOLS } from "@/lib/tools/registry";

const EMAIL = "isnanik@daum.net";
const TOOL_NAMES: Record<string, string> = { hwpHwpxViewer: "HWP·HWPX 문서 뷰어", privacyRedactor: "이미지 개인정보 가리기", screenshotStitcher: "스크린샷 이어붙이기", imageMetadataRemover: "사진 메타데이터 삭제", screenshotStatusbarRemover: "스크린샷 상태바 제거", excelChartMaker: "엑셀·CSV 그래프 만들기" };

export function ContactMailtoForm({ initialTool = "" }: { initialTool?: string }) {
  const normalizedTool = initialTool.startsWith("/tools/") ? initialTool : initialTool ? `/tools/${initialTool}` : "";
  const [type, setType] = useState("도구 오류");
  const [tool, setTool] = useState(PUBLIC_TOOLS.some(item => item.path === normalizedTool) ? normalizedTool : "");
  const [browser, setBrowser] = useState("");
  const [os, setOs] = useState("");
  const [description, setDescription] = useState("");
  const mailto = useMemo(() => { const toolName = PUBLIC_TOOLS.find(item => item.path === tool); const body = [`문의 유형: ${type}`, `관련 도구: ${toolName ? TOOL_NAMES[toolName.translationKey] ?? toolName.translationKey : "선택하지 않음"}`, `브라우저: ${browser || "미입력"}`, `운영체제: ${os || "미입력"}`, "", "문제 설명:", description || "(여기에 문제 상황과 재현 순서를 작성해 주세요.)"].join("\n"); return `mailto:${EMAIL}?subject=${encodeURIComponent(`[Konly] ${type}`)}&body=${encodeURIComponent(body)}`; }, [browser, description, os, tool, type]);
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-7"><h2 className="text-xl font-bold text-[var(--foreground)]">문의 내용 준비하기</h2><p className="mt-2 leading-7 text-[var(--text-muted)]">입력한 내용은 서버에 저장되지 않습니다. 아래 버튼을 누르면 사용 중인 이메일 프로그램에 제목과 본문이 채워집니다.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="문의 유형"><select value={type} onChange={event => setType(event.target.value)} className={inputClass}>{["도구 오류", "파일 지원 문제", "사용 방법 문의", "기능 제안", "개인정보 관련 문의", "기타"].map(item => <option key={item}>{item}</option>)}</select></Field><Field label="관련 도구"><select value={tool} onChange={event => setTool(event.target.value)} className={inputClass}><option value="">선택하지 않음</option>{PUBLIC_TOOLS.map(item => <option key={item.path} value={item.path}>{TOOL_NAMES[item.translationKey] ?? item.translationKey}</option>)}</select></Field><Field label="브라우저"><input value={browser} onChange={event => setBrowser(event.target.value)} placeholder="예: Chrome 140" className={inputClass}/></Field><Field label="운영체제"><input value={os} onChange={event => setOs(event.target.value)} placeholder="예: Windows 11" className={inputClass}/></Field><div className="sm:col-span-2"><Field label="문제 설명"><textarea value={description} onChange={event => setDescription(event.target.value)} rows={6} placeholder="어떤 순서로 사용했고, 무엇을 예상했으며, 실제로 어떤 문제가 발생했는지 적어주세요." className={inputClass}/></Field></div></div><p className="mt-5 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 text-sm leading-6 text-[var(--warning-fg)]">오류 제보 시 주민등록번호, 전화번호, 주소 등 개인정보가 포함된 원본 파일은 첨부하지 않는 것을 권장합니다. 필요한 경우 개인정보를 가린 화면만 보내주세요.</p><a href={mailto} className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--primary-fill)] px-5 py-3 font-bold text-white focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]">이메일 작성 화면 열기</a><p className="mt-3 text-sm text-[var(--text-muted)]">이메일 프로그램이 열리지 않으면 {EMAIL}으로 직접 보내주세요.</p></section>;
}

const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block font-bold text-[var(--foreground)]">{label}{children}</label>; }
