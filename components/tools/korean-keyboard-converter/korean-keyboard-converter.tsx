"use client";

import { ArrowLeftRight, Copy, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { convertKeyboardText, type KeyboardDirection } from "@/lib/tools/korean-keyboard-converter/convert";

const EXAMPLES = [
  { input: "dkssudgktpdy", direction: "en-to-ko" as const, result: "안녕하세요" },
  { input: "rkatkgkqslek", direction: "en-to-ko" as const, result: "감사합니다" },
  { input: "반갑습니다", direction: "ko-to-en" as const, result: "qksrkqtmqslek" },
];

export function KoreanKeyboardConverter() {
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState<KeyboardDirection>("en-to-ko");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const result = useMemo(() => convertKeyboardText(input, direction), [direction, input]);

  function swapDirection() {
    setDirection(current => current === "en-to-ko" ? "ko-to-en" : "en-to-ko");
    if (result) setInput(result);
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch { /* Clipboard permission can be unavailable. */ }
  }

  function reset() {
    setInput("");
    setCopied(false);
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-full rounded-xl bg-[var(--surface-muted)] p-1 sm:w-auto" role="group" aria-label="변환 방향">
            <DirectionButton active={direction === "en-to-ko"} onClick={() => setDirection("en-to-ko")}>영문 자판 → 한글</DirectionButton>
            <DirectionButton active={direction === "ko-to-en"} onClick={() => setDirection("ko-to-en")}>한글 → 영문 자판</DirectionButton>
          </div>
          <Button variant="secondary" onClick={swapDirection} disabled={!input}><ArrowLeftRight size={17}/>결과로 방향 바꾸기</Button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label htmlFor="keyboard-converter-input" className="text-lg font-bold text-[var(--foreground)]">잘못 입력한 내용</label>
              <Button variant="secondary" onClick={reset} disabled={!input}><RotateCcw size={17}/>초기화</Button>
            </div>
            <textarea ref={inputRef} id="keyboard-converter-input" value={input} onChange={event => setInput(event.target.value)} rows={9} spellCheck={false} autoCapitalize="off" placeholder={direction === "en-to-ko" ? "예: dkssudgktpdy" : "예: 안녕하세요"} className="min-h-56 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono leading-7 text-[var(--foreground)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"/>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label htmlFor="keyboard-converter-result" className="text-lg font-bold text-[var(--foreground)]">변환 결과</label>
              <Button variant="secondary" onClick={copyResult} disabled={!result}><Copy size={17}/>{copied ? "복사됨" : "복사"}</Button>
            </div>
            <textarea id="keyboard-converter-result" value={result} readOnly rows={9} spellCheck={false} className="min-h-56 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 font-mono leading-7 text-[var(--foreground)]"/>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-[var(--info-bg)] p-4 text-sm leading-6 text-[var(--info-fg)]">입력 내용은 서버로 전송되지 않으며 현재 브라우저에서 바로 변환됩니다. 표준 두벌식 자판을 기준으로 합니다.</p>
      </section>

      <section aria-labelledby="keyboard-examples" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <h2 id="keyboard-examples" className="text-xl font-bold text-[var(--foreground)]">빠른 예시</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">{EXAMPLES.map(example => <button key={example.input} type="button" onClick={() => { setDirection(example.direction); setInput(example.input); }} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-left transition hover:border-[var(--info-border)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"><span className="block break-all font-mono text-sm text-[var(--text-muted)]">{example.input}</span><span className="mt-2 block font-bold text-[var(--foreground)]">→ {example.result}</span></button>)}</div>
      </section>
    </div>
  );
}

function DirectionButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-11 flex-1 rounded-lg px-4 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] ${active ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}>{children}</button>;
}
