export type TextCounts = {
  characters: number;
  charactersWithoutWhitespace: number;
  words: number;
  lines: number;
};

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
