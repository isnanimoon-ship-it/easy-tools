const INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"] as const;
const VOWELS = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"] as const;
const FINALS = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"] as const;

const KEY_TO_JAMO: Record<string, string> = {
  r: "ㄱ", R: "ㄲ", s: "ㄴ", e: "ㄷ", E: "ㄸ", f: "ㄹ", a: "ㅁ", q: "ㅂ", Q: "ㅃ",
  t: "ㅅ", T: "ㅆ", d: "ㅇ", w: "ㅈ", W: "ㅉ", c: "ㅊ", z: "ㅋ", x: "ㅌ", v: "ㅍ", g: "ㅎ",
  k: "ㅏ", o: "ㅐ", i: "ㅑ", O: "ㅒ", j: "ㅓ", p: "ㅔ", u: "ㅕ", P: "ㅖ", h: "ㅗ",
  y: "ㅛ", n: "ㅜ", b: "ㅠ", m: "ㅡ", l: "ㅣ",
};

for (const key of Object.keys(KEY_TO_JAMO)) {
  if (key === key.toLowerCase() && !KEY_TO_JAMO[key.toUpperCase()]) KEY_TO_JAMO[key.toUpperCase()] = KEY_TO_JAMO[key];
}

const VOWEL_COMBINE: Record<string, string> = { "ㅗㅏ": "ㅘ", "ㅗㅐ": "ㅙ", "ㅗㅣ": "ㅚ", "ㅜㅓ": "ㅝ", "ㅜㅔ": "ㅞ", "ㅜㅣ": "ㅟ", "ㅡㅣ": "ㅢ" };
const FINAL_COMBINE: Record<string, string> = { "ㄱㅅ": "ㄳ", "ㄴㅈ": "ㄵ", "ㄴㅎ": "ㄶ", "ㄹㄱ": "ㄺ", "ㄹㅁ": "ㄻ", "ㄹㅂ": "ㄼ", "ㄹㅅ": "ㄽ", "ㄹㅌ": "ㄾ", "ㄹㅍ": "ㄿ", "ㄹㅎ": "ㅀ", "ㅂㅅ": "ㅄ" };
const FINAL_SPLIT = Object.fromEntries(Object.entries(FINAL_COMBINE).map(([parts, combined]) => [combined, [...parts]])) as Record<string, string[]>;
const INITIAL_INDEX = new Map<string, number>(INITIALS.map((value, index) => [value, index]));
const VOWEL_INDEX = new Map<string, number>(VOWELS.map((value, index) => [value, index]));
const FINAL_INDEX = new Map<string, number>(FINALS.map((value, index) => [value, index]));
const JAMO_TO_KEY: Record<string, string> = {
  "ㄱ": "r", "ㄲ": "R", "ㄳ": "rt", "ㄴ": "s", "ㄵ": "sw", "ㄶ": "sg", "ㄷ": "e", "ㄸ": "E", "ㄹ": "f",
  "ㄺ": "fr", "ㄻ": "fa", "ㄼ": "fq", "ㄽ": "ft", "ㄾ": "fx", "ㄿ": "fv", "ㅀ": "fg", "ㅁ": "a", "ㅂ": "q",
  "ㅃ": "Q", "ㅄ": "qt", "ㅅ": "t", "ㅆ": "T", "ㅇ": "d", "ㅈ": "w", "ㅉ": "W", "ㅊ": "c", "ㅋ": "z",
  "ㅌ": "x", "ㅍ": "v", "ㅎ": "g", "ㅏ": "k", "ㅐ": "o", "ㅑ": "i", "ㅒ": "O", "ㅓ": "j", "ㅔ": "p",
  "ㅕ": "u", "ㅖ": "P", "ㅗ": "h", "ㅘ": "hk", "ㅙ": "ho", "ㅚ": "hl", "ㅛ": "y", "ㅜ": "n",
  "ㅝ": "nj", "ㅞ": "np", "ㅟ": "nl", "ㅠ": "b", "ㅡ": "m", "ㅢ": "ml", "ㅣ": "l",
};

function syllable(initial: string | null, vowel: string | null, final: string | null) {
  if (!initial || !vowel) return `${initial ?? ""}${vowel ?? ""}${final ?? ""}`;
  return String.fromCharCode(0xac00 + INITIAL_INDEX.get(initial)! * 588 + VOWEL_INDEX.get(vowel)! * 28 + (FINAL_INDEX.get(final ?? "") ?? 0));
}

export function englishKeysToKorean(input: string): string {
  let output = "";
  let initial: string | null = null;
  let vowel: string | null = null;
  let final: string | null = null;
  const flush = () => { output += syllable(initial, vowel, final); initial = vowel = final = null; };

  for (const char of input) {
    const jamo = KEY_TO_JAMO[char];
    if (!jamo) { flush(); output += char; continue; }
    const isVowel = VOWEL_INDEX.has(jamo as typeof VOWELS[number]);
    if (isVowel) {
      if (final) {
        const splitFinal: string[] | undefined = FINAL_SPLIT[final];
        if (splitFinal) { final = splitFinal[0]; const nextInitial = splitFinal[1]; flush(); initial = nextInitial; vowel = jamo; }
        else { const nextInitial = final; final = null; flush(); initial = nextInitial; vowel = jamo; }
      } else if (vowel) {
        const combined: string | undefined = VOWEL_COMBINE[vowel + jamo];
        if (combined) vowel = combined;
        else { flush(); vowel = jamo; }
      } else vowel = jamo;
      continue;
    }

    if (!initial && !vowel) initial = jamo;
    else if (!initial && vowel) { flush(); initial = jamo; }
    else if (initial && !vowel) { flush(); initial = jamo; }
    else if (!final && FINAL_INDEX.has(jamo as typeof FINALS[number])) final = jamo;
    else if (final) {
      const combined = FINAL_COMBINE[final + jamo];
      if (combined) final = combined;
      else { flush(); initial = jamo; }
    } else { flush(); initial = jamo; }
  }
  flush();
  return output;
}

export function koreanToEnglishKeys(input: string): string {
  return [...input.normalize("NFC")].map(char => {
    const code = char.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const offset = code - 0xac00;
      const initial = INITIALS[Math.floor(offset / 588)];
      const vowel = VOWELS[Math.floor((offset % 588) / 28)];
      const final = FINALS[offset % 28];
      return `${JAMO_TO_KEY[initial]}${JAMO_TO_KEY[vowel]}${final ? JAMO_TO_KEY[final] : ""}`;
    }
    return JAMO_TO_KEY[char] ?? char;
  }).join("");
}

export type KeyboardDirection = "en-to-ko" | "ko-to-en";
export function convertKeyboardText(input: string, direction: KeyboardDirection) {
  return direction === "en-to-ko" ? englishKeysToKorean(input) : koreanToEnglishKeys(input);
}
