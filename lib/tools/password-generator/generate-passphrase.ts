import { browserRandomSource, unbiasedRandomIndex, type RandomSource } from "./generate-password";
import { EFF_WORDLIST } from "./wordlist";

export const PASSPHRASE_SEPARATORS = ["-", "_", ".", " ", ""] as const;
export type PassphraseSeparator = (typeof PASSPHRASE_SEPARATORS)[number];

export type PassphraseOptions = {
  wordCount: number;
  separator: PassphraseSeparator;
  capitalize: boolean;
  includeNumber: boolean;
};

export type PassphraseGenerationResult =
  | { ok: true; passphrase: string; wordCount: number; poolSize: number }
  | { ok: false; reason: "invalid-word-count" | "random-unavailable" };

function capitalizeWord(word: string): string {
  return word.length === 0 ? word : word[0].toUpperCase() + word.slice(1);
}

/**
 * Draws `wordCount` independent, with-replacement picks from the EFF word list — the
 * standard Diceware model. Duplicate words across a single passphrase are allowed on
 * purpose (deduplicating would only lower the real entropy and complicate the math for
 * no practical benefit at this word-list size). Entropy for the strength meter should be
 * computed as `wordCount * log2(EFF_WORDLIST.length)`, the same estimateEntropy() used for
 * character passwords — separator/capitalization are treated as public settings, and the
 * inserted digit's extra bits are deliberately left uncounted, an intentional
 * underestimate rather than an overestimate of strength.
 */
export function generatePassphrase(
  options: PassphraseOptions,
  randomSource: RandomSource = browserRandomSource,
): PassphraseGenerationResult {
  if (!Number.isInteger(options.wordCount) || options.wordCount < 3 || options.wordCount > 6) {
    return { ok: false, reason: "invalid-word-count" };
  }

  try {
    const words = Array.from(
      { length: options.wordCount },
      () => EFF_WORDLIST[unbiasedRandomIndex(EFF_WORDLIST.length, randomSource)],
    );
    const cased = options.capitalize ? words.map(capitalizeWord) : words;
    if (options.includeNumber) {
      const position = unbiasedRandomIndex(cased.length, randomSource);
      const digit = String(unbiasedRandomIndex(10, randomSource));
      cased[position] = cased[position] + digit;
    }
    return { ok: true, passphrase: cased.join(options.separator), wordCount: options.wordCount, poolSize: EFF_WORDLIST.length };
  } catch {
    return { ok: false, reason: "random-unavailable" };
  }
}
