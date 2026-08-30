import { strToU8, zipSync, type Zippable } from "fflate";

export type PackageFile = { name: string; data: Uint8Array };

/**
 * fflate is the one exception to this project's zero-dependency default:
 * a hand-rolled ZIP writer has to track per-file offsets across a central
 * directory correctly, and a single off-by-one produces an archive that
 * simply won't open — a failure mode worse than a small extra dependency.
 * level:0 stores files as-is; the PNGs/ICO inside are already compressed,
 * so there's nothing to gain from re-compressing them.
 */
export function buildZip(files: PackageFile[]): Uint8Array {
  const entries: Zippable = {};
  for (const file of files) {
    entries[file.name] = [file.data, { level: 0 }];
  }
  return zipSync(entries);
}

export function textToBytes(text: string): Uint8Array {
  return strToU8(text);
}
