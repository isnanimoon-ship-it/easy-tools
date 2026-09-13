import { zipSync, type Zippable } from "fflate";
import type { SupportedImageMime } from "./types";

const extensions: Record<SupportedImageMime, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function cleanedFilename(original: string, mime: SupportedImageMime) {
  const withoutPath = original.replace(/^.*[\\/]/, "").replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_");
  const base = withoutPath.replace(/\.[^.]*$/, "").trim().replace(/[. ]+$/, "") || "image";
  return `${base.slice(0, 120)}-metadata-removed.${extensions[mime]}`;
}

export function uniqueName(used: Set<string>, desired: string) {
  if (!used.has(desired)) { used.add(desired); return desired; }
  const dot = desired.lastIndexOf("."); const base = desired.slice(0, dot); const extension = desired.slice(dot);
  let n = 2; while (used.has(`${base}-${n}${extension}`)) n++;
  const result = `${base}-${n}${extension}`; used.add(result); return result;
}

export function buildMetadataZip(entries: Array<{ name: string; bytes: Uint8Array }>) {
  const data: Zippable = {};
  for (const entry of entries) data[entry.name] = [entry.bytes, { level: 0 }];
  return zipSync(data);
}

