"use client";

import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { countText } from "@/lib/tools/word-counter/count-text";

export type WordCounterLabels = {
  inputLabel: string;
  inputDescription: string;
  placeholder: string;
  reset: string;
  resultsLabel: string;
  characters: string;
  charactersWithoutWhitespace: string;
  words: string;
  lines: string;
};

type WordCounterProps = {
  locale: string;
  labels: WordCounterLabels;
};

export function WordCounter({ locale, labels }: WordCounterProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const counts = useMemo(() => countText(text, locale), [locale, text]);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const metrics = [
    { label: labels.characters, value: counts.characters, testId: "characters" },
    {
      label: labels.charactersWithoutWhitespace,
      value: counts.charactersWithoutWhitespace,
      testId: "characters-without-whitespace",
    },
    { label: labels.words, value: counts.words, testId: "words" },
    { label: labels.lines, value: counts.lines, testId: "lines" },
  ];

  function reset() {
    setText("");
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="word-counter-input-label"
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <label
              id="word-counter-input-label"
              htmlFor="word-counter-input"
              className="block text-lg font-bold text-slate-950"
            >
              {labels.inputLabel}
            </label>
            <p id="word-counter-input-description" className="mt-1 text-sm leading-6 text-slate-600">
              {labels.inputDescription}
            </p>
          </div>
          <Button variant="secondary" disabled={!text} onClick={reset}>
            {labels.reset}
          </Button>
        </div>
        <textarea
          ref={inputRef}
          id="word-counter-input"
          aria-describedby="word-counter-input-description"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={labels.placeholder}
          rows={10}
          spellCheck={false}
          className="min-h-64 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 leading-7 text-slate-950 placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600"
        />
      </section>

      <section aria-labelledby="word-counter-results-heading">
        <h2 id="word-counter-results-heading" className="text-xl font-bold text-slate-950">
          {labels.resultsLabel}
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.testId}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <dt className="break-keep text-sm font-semibold leading-5 text-slate-600">
                {metric.label}
              </dt>
              <dd
                data-testid={metric.testId}
                className="mt-2 break-all text-3xl font-bold tabular-nums tracking-tight text-slate-950"
              >
                {numberFormatter.format(metric.value)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
