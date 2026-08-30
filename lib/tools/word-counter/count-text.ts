export type TextCounts = {
  characters: number;
  charactersWithoutWhitespace: number;
  words: number;
  lines: number;
};

export type ReadingTime = { unit: "seconds" | "minutes"; value: number };

const READING_SPEEDS: Record<string, { unit: "words" | "charactersWithoutWhitespace"; perMinute: number }> = {
  ko: { unit: "charactersWithoutWhitespace", perMinute: 350 },
  ja: { unit: "charactersWithoutWhitespace", perMinute: 400 },
};
const DEFAULT_READING_SPEED = { unit: "words" as const, perMinute: 200 };

const graphemeSegmenters = new Map<string, Intl.Segmenter>();
const wordSegmenters = new Map<string, Intl.Segmenter>();

function normalizeLineBreaks(text: string) {
  return text.replace(/\r\n?/g, "\n");
}

function getSegmenter(
  locale: string,
  granularity: "grapheme" | "word",
) {
  const cache = granularity === "grapheme" ? graphemeSegmenters : wordSegmenters;
  const cached = cache.get(locale);

  if (cached) {
    return cached;
  }

  const segmenter = new Intl.Segmenter(locale, { granularity });
  cache.set(locale, segmenter);
  return segmenter;
}

function countWords(text: string, locale: string) {
  if (typeof Intl.Segmenter === "function") {
    return Array.from(getSegmenter(locale, "word").segment(text)).filter(
      (part) => part.isWordLike,
    ).length;
  }

  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

export function countText(text: string, locale: string): TextCounts {
  if (!text) {
    return {
      characters: 0,
      charactersWithoutWhitespace: 0,
      words: 0,
      lines: 0,
    };
  }

  const normalizedText = normalizeLineBreaks(text);
  const graphemes =
    typeof Intl.Segmenter === "function"
      ? Array.from(getSegmenter(locale, "grapheme").segment(normalizedText), (part) =>
          part.segment,
        )
      : Array.from(normalizedText);

  return {
    characters: graphemes.length,
    charactersWithoutWhitespace: graphemes.filter(
      (grapheme) => !/^\p{White_Space}+$/u.test(grapheme),
    ).length,
    words: countWords(normalizedText, locale),
    lines: normalizedText.split("\n").length,
  };
}

export function estimateReadingTime(counts: TextCounts, locale: string): ReadingTime | null {
  const speed = READING_SPEEDS[locale.split("-")[0]] ?? DEFAULT_READING_SPEED;
  const amount = speed.unit === "words" ? counts.words : counts.charactersWithoutWhitespace;

  if (amount === 0) {
    return null;
  }

  const totalSeconds = Math.max(1, Math.round((amount / speed.perMinute) * 60));
  return totalSeconds < 60
    ? { unit: "seconds", value: totalSeconds }
    : { unit: "minutes", value: Math.max(1, Math.round(totalSeconds / 60)) };
}
