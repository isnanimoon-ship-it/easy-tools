export const PASSWORD_CHARACTER_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
} as const;

export type PasswordOptions = {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

export type RandomSource = (values: Uint32Array) => Uint32Array;

export type PasswordGenerationResult =
  | { ok: true; password: string; poolSize: number }
  | { ok: false; reason: "invalid-length" | "no-character-types" | "random-unavailable" };

export function selectedCharacterSets(options: PasswordOptions) {
  return (Object.keys(PASSWORD_CHARACTER_SETS) as Array<keyof typeof PASSWORD_CHARACTER_SETS>)
    .filter((key) => options[key])
    .map((key) => PASSWORD_CHARACTER_SETS[key]);
}

function browserRandomSource(values: Uint32Array) {
  if (!globalThis.crypto?.getRandomValues) throw new Error("Secure random unavailable");
  return globalThis.crypto.getRandomValues(values);
}

export function unbiasedRandomIndex(maxExclusive: number, randomSource: RandomSource) {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1) throw new RangeError("Invalid range");
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const values = new Uint32Array(1);
  let value: number;
  do {
    randomSource(values);
    value = values[0];
  } while (value >= limit);
  return value % maxExclusive;
}

export function generatePassword(
  options: PasswordOptions,
  randomSource: RandomSource = browserRandomSource,
): PasswordGenerationResult {
  if (!Number.isInteger(options.length) || options.length < 8 || options.length > 128) {
    return { ok: false, reason: "invalid-length" };
  }

  const sets = selectedCharacterSets(options);
  if (sets.length === 0) return { ok: false, reason: "no-character-types" };
  const pool = sets.join("");

  try {
    const characters = sets.map((set) => set[unbiasedRandomIndex(set.length, randomSource)]);
    while (characters.length < options.length) {
      characters.push(pool[unbiasedRandomIndex(pool.length, randomSource)]);
    }
    for (let index = characters.length - 1; index > 0; index -= 1) {
      const target = unbiasedRandomIndex(index + 1, randomSource);
      [characters[index], characters[target]] = [characters[target], characters[index]];
    }
    return { ok: true, password: characters.join(""), poolSize: pool.length };
  } catch {
    return { ok: false, reason: "random-unavailable" };
  }
}
