export const INITIALS = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
  "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

const SYLLABLE_START = 0xac00; // 가
const SYLLABLE_END = 0xd7a3; // 힣
const INITIAL_STRIDE = 588; // 21 vowels x 28 finals (including "no final")

const WHITESPACE_PATTERN = /[  　]+/g;

export function toInitial(codePoint: number): string | null {
  if (codePoint < SYLLABLE_START || codePoint > SYLLABLE_END) return null;
  const index = Math.floor((codePoint - SYLLABLE_START) / INITIAL_STRIDE);
  return INITIALS[index];
}

export type ConvertOptions = {
  removeWhitespace: boolean;
};

export function convertText(text: string, options: ConvertOptions): string {
  const normalized = text.normalize("NFC");
  const mapped = [...normalized]
    .map((char) => toInitial(char.codePointAt(0)!) ?? char)
    .join("");
  return options.removeWhitespace ? mapped.replace(WHITESPACE_PATTERN, "") : mapped;
}

export function charCount(text: string): number {
  return [...text].length;
}
