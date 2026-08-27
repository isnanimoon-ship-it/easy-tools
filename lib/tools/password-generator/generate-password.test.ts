import { describe, expect, it, vi } from "vitest";

import { generatePassword, PASSWORD_CHARACTER_SETS, unbiasedRandomIndex, type PasswordOptions, type RandomSource } from "./generate-password";

const allOptions: PasswordOptions = { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true };

function sequenceSource(sequence: number[]): RandomSource {
  let index = 0;
  return (values) => { values[0] = sequence[index % sequence.length]; index += 1; return values; };
}

describe("generatePassword", () => {
  it("uses the exact approved character sets", () => {
    expect(PASSWORD_CHARACTER_SETS).toEqual({ uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", lowercase: "abcdefghijklmnopqrstuvwxyz", numbers: "0123456789", symbols: "!@#$%^&*()-_=+[]{};:,.?" });
  });

  it.each([8, 16, 128])("generates exactly %i characters", (length) => {
    const result = generatePassword({ ...allOptions, length }, sequenceSource([0, 1, 2, 3, 4, 5]));
    expect(result.ok && result.password).toHaveLength(length);
  });

  it("includes every selected type and excludes disabled types", () => {
    const result = generatePassword({ ...allOptions, numbers: false, symbols: false }, sequenceSource([0, 1, 2, 3]));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.password).toMatch(/[A-Z]/);
      expect(result.password).toMatch(/[a-z]/);
      expect(result.password).not.toMatch(/[0-9!@#$%^&*()\-_=+\[\]{};:,.?]/);
    }
  });

  it("rejects invalid length and no selected character types", () => {
    expect(generatePassword({ ...allOptions, length: 7 })).toEqual({ ok: false, reason: "invalid-length" });
    expect(generatePassword({ length: 16, uppercase: false, lowercase: false, numbers: false, symbols: false })).toEqual({ ok: false, reason: "no-character-types" });
  });

  it("rejects out-of-range values before modulo to remove bias", () => {
    const source = vi.fn(sequenceSource([0xffffffff, 7]));
    expect(unbiasedRandomIndex(10, source)).toBe(7);
    expect(source).toHaveBeenCalledTimes(2);
  });

  it("uses the supplied secure source for selection and shuffle", () => {
    const mathRandom = vi.spyOn(Math, "random");
    const source = vi.fn(sequenceSource([1, 2, 3, 4, 5]));
    const result = generatePassword(allOptions, source);
    expect(result.ok).toBe(true);
    expect(source.mock.calls.length).toBeGreaterThan(allOptions.length);
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it("returns a safe error when secure randomness fails", () => {
    expect(generatePassword(allOptions, () => { throw new Error("unavailable"); })).toEqual({ ok: false, reason: "random-unavailable" });
  });
});
