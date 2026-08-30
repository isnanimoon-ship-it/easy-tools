import { describe, expect, it, vi } from "vitest";

import { generatePassphrase, PASSPHRASE_SEPARATORS, type PassphraseOptions } from "./generate-passphrase";
import type { RandomSource } from "./generate-password";
import { EFF_WORDLIST } from "./wordlist";

const baseOptions: PassphraseOptions = { wordCount: 4, separator: "-", capitalize: false, includeNumber: false };

function sequenceSource(sequence: number[]): RandomSource {
  let index = 0;
  return (values) => { values[0] = sequence[index % sequence.length]; index += 1; return values; };
}

describe("EFF_WORDLIST", () => {
  it("is the real, unmodified 7,776-word EFF Diceware list", () => {
    expect(EFF_WORDLIST).toHaveLength(7776);
    expect(new Set(EFF_WORDLIST).size).toBe(7776);
    expect(EFF_WORDLIST[0]).toBe("abacus");
    expect(EFF_WORDLIST.at(-1)).toBe("zoom");
  });

  it("contains only short, safe-to-render entries", () => {
    for (const word of EFF_WORDLIST) {
      expect(word.length).toBeGreaterThanOrEqual(3);
      expect(word.length).toBeLessThanOrEqual(9);
      expect(word).toMatch(/^[a-z]+(-[a-z]+)?$/);
    }
  });
});

describe("generatePassphrase", () => {
  it.each([3, 4, 5, 6])("joins exactly %i words", (wordCount) => {
    const result = generatePassphrase({ ...baseOptions, wordCount }, sequenceSource([0, 1, 2, 3, 4, 5]));
    expect(result.ok).toBe(true);
    expect(result.ok && result.passphrase.split("-")).toHaveLength(wordCount);
  });

  it("rejects word counts outside the 3-6 range", () => {
    expect(generatePassphrase({ ...baseOptions, wordCount: 2 })).toEqual({ ok: false, reason: "invalid-word-count" });
    expect(generatePassphrase({ ...baseOptions, wordCount: 7 })).toEqual({ ok: false, reason: "invalid-word-count" });
  });

  it("picks the exact words the random source selects", () => {
    const result = generatePassphrase({ ...baseOptions, wordCount: 3 }, sequenceSource([0, 1, 2]));
    expect(result).toEqual({ ok: true, passphrase: `${EFF_WORDLIST[0]}-${EFF_WORDLIST[1]}-${EFF_WORDLIST[2]}`, wordCount: 3, poolSize: EFF_WORDLIST.length });
  });

  it.each(PASSPHRASE_SEPARATORS)("joins words with the %j separator, including empty", (separator) => {
    const result = generatePassphrase({ ...baseOptions, separator }, sequenceSource([0, 1, 2, 3]));
    expect(result.ok && result.passphrase).toBe([EFF_WORDLIST[0], EFF_WORDLIST[1], EFF_WORDLIST[2], EFF_WORDLIST[3]].join(separator));
  });

  it("capitalizes the first letter of every word when enabled", () => {
    const result = generatePassphrase({ ...baseOptions, capitalize: true }, sequenceSource([0, 1, 2, 3]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const word of result.passphrase.split("-")) expect(word[0]).toBe(word[0].toUpperCase());
  });

  it("appends exactly one digit to one word when includeNumber is enabled", () => {
    const result = generatePassphrase({ ...baseOptions, includeNumber: true }, sequenceSource([0, 1, 2, 3, 0, 5]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const digitCount = (result.passphrase.match(/\d/g) ?? []).length;
    expect(digitCount).toBe(1);
  });

  it("never inserts a digit when includeNumber is disabled", () => {
    const result = generatePassphrase({ ...baseOptions, includeNumber: false }, sequenceSource([0, 1, 2, 3]));
    expect(result.ok && /\d/.test(result.passphrase)).toBe(false);
  });

  it("allows duplicate words across the same passphrase (standard Diceware model)", () => {
    const result = generatePassphrase({ ...baseOptions, wordCount: 3 }, sequenceSource([5, 5, 5]));
    expect(result).toEqual({ ok: true, passphrase: `${EFF_WORDLIST[5]}-${EFF_WORDLIST[5]}-${EFF_WORDLIST[5]}`, wordCount: 3, poolSize: EFF_WORDLIST.length });
  });

  it("uses the supplied secure source, never Math.random", () => {
    const mathRandom = vi.spyOn(Math, "random");
    const source = vi.fn(sequenceSource([1, 2, 3]));
    const result = generatePassphrase(baseOptions, source);
    expect(result.ok).toBe(true);
    expect(source).toHaveBeenCalled();
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it("returns a safe error when secure randomness fails", () => {
    expect(generatePassphrase(baseOptions, () => { throw new Error("unavailable"); })).toEqual({ ok: false, reason: "random-unavailable" });
  });
});
