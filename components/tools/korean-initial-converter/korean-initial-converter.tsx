"use client";

import { useMemo, useRef, useState } from "react";
import { Copy, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { charCount, convertText } from "@/lib/tools/korean-initial-converter/convert";

const EXAMPLES = ["안녕하세요", "대한민국", "오늘 날씨 좋다", "ChatGPT 최고"];

export function KoreanInitialConverter() {
  const t = useTranslations("Tools.koreanInitialConverter");
  const [input, setInput] = useState("");
  const [removeWhitespace, setRemoveWhitespace] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const result = useMemo(
    () => convertText(input, { removeWhitespace }),
    [input, removeWhitespace],
  );
  const inputChars = useMemo(() => charCount(input), [input]);
  const resultChars = useMemo(() => charCount(result), [result]);

  function resetAll() {
    setInput("");
    setRemoveWhitespace(false);
    inputRef.current?.focus();
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (insecure context, permission denied);
      // the button simply stays unconfirmed, no separate error state needed.
    }
  }

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="korean-initial-input-label"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <label
            id="korean-initial-input-label"
            htmlFor="korean-initial-input"
            className="block text-lg font-bold text-[var(--foreground)]"
          >
            {t("input.label")}
          </label>
          <Button variant="secondary" disabled={!input} onClick={resetAll}>
            <RotateCcw size={17} />
            {t("actions.reset")}
          </Button>
        </div>
        <textarea
          ref={inputRef}
          id="korean-initial-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("input.placeholder")}
          rows={6}
          spellCheck={false}
          className="min-h-40 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 leading-7 text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
        />
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={removeWhitespace}
            onChange={(event) => setRemoveWhitespace(event.target.checked)}
            className="size-4"
          />
          {t("options.removeWhitespace")}
        </label>
      </section>

      <section
        aria-labelledby="korean-initial-result-label"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <label
            id="korean-initial-result-label"
            htmlFor="korean-initial-result"
            className="block text-lg font-bold text-[var(--foreground)]"
          >
            {t("result.label")}
          </label>
          <Button variant="secondary" disabled={!result} onClick={copyResult}>
            <Copy size={17} />
            {copied ? t("actions.copied") : t("actions.copy")}
          </Button>
        </div>
        <textarea
          id="korean-initial-result"
          value={result}
          readOnly
          rows={6}
          spellCheck={false}
          className="min-h-40 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 leading-7 text-[var(--foreground)]"
        />
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          {t("stats", { input: inputChars, result: resultChars })}
        </p>
      </section>

      <section
        aria-labelledby="korean-initial-examples-heading"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"
      >
        <h2 id="korean-initial-examples-heading" className="font-bold text-[var(--foreground)]">
          {t("examples.title")}
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm text-[var(--text-muted)]">
          {EXAMPLES.map((example) => (
            <li key={example}>
              <span className="text-[var(--foreground)]">{example}</span>
              {" → "}
              <span className="font-mono">{convertText(example, { removeWhitespace: false })}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-xl bg-[var(--info-bg)] p-4 text-sm leading-6 text-[var(--info-fg)]">
        {t("privacy")}
      </p>
    </div>
  );
}
