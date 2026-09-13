export const MAX_MARKDOWN_FILE_BYTES = 2 * 1024 * 1024;
export type MarkdownFileError = "unsupported-extension" | "file-too-large" | "empty-file" | "invalid-utf8" | "binary-file" | "read-failed";

export function validateMarkdownFileMeta(file: Pick<File, "name" | "size">): MarkdownFileError | null {
  if (file.size === 0) return "empty-file";
  if (file.size > MAX_MARKDOWN_FILE_BYTES) return "file-too-large";
  const extension = file.name.toLocaleLowerCase().split(".").pop();
  return extension === "md" || extension === "markdown" || extension === "txt" ? null : "unsupported-extension";
}

export function decodeMarkdownBytes(bytes: Uint8Array): { ok: true; text: string } | { ok: false; error: MarkdownFileError } {
  if (bytes.includes(0)) return { ok: false, error: "binary-file" };
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, error: "invalid-utf8" };
  }
}
