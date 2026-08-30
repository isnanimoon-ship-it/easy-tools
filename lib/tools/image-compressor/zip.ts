import { zipSync, type Zippable } from "fflate";

export type ZipEntry = { name: string; data: Uint8Array };

/**
 * fflate is the one exception to this project's zero-dependency default (see
 * favicon-generator's lib/tools/favicon-generator/package.ts for the original
 * rationale). level:0 stores files as-is — the JPEG/PNG/WebP bytes going in are
 * already compressed, so re-compressing them again would only cost CPU time.
 */
export function buildImageZip(entries: ZipEntry[]): Uint8Array {
  const zippable: Zippable = {};
  for (const entry of entries) zippable[entry.name] = [entry.data, { level: 0 }];
  return zipSync(zippable);
}

/**
 * Two different source files can produce the same output filename (e.g. two
 * uploads both named "photo.jpg" from different folders). Appends " (2)", " (3)"
 * etc. before the extension until the name is unique within this zip.
 */
export function uniqueFilename(used: Set<string>, name: string): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const base = dot === -1 ? name : name.slice(0, dot);
  const extension = dot === -1 ? "" : name.slice(dot);
  let counter = 2;
  let candidate = `${base} (${counter})${extension}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${base} (${counter})${extension}`;
  }
  used.add(candidate);
  return candidate;
}
