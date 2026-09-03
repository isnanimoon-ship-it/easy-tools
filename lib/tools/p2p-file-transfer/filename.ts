const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const DANGEROUS = new Set(["exe", "msi", "bat", "cmd", "ps1", "sh", "apk", "dmg", "pkg", "js", "jar"]);

export function utf8Length(value: string): number { return new TextEncoder().encode(value).byteLength; }

export function sanitizeFileName(input: string): string {
  const cleaned = input.normalize("NFC").replace(/[\/\\\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "_").replace(/[. ]+$/g, "");
  let safe = !cleaned || cleaned === "." || cleaned === ".." || RESERVED.test(cleaned) ? `file_${cleaned.replace(/\.+/g, "") || "download"}` : cleaned;
  if (utf8Length(safe) <= 255) return safe;
  const dot = safe.lastIndexOf("."); const extension = dot > 0 ? safe.slice(dot) : ""; const stem = dot > 0 ? safe.slice(0, dot) : safe;
  let shortened = stem;
  while (shortened && utf8Length(`${shortened}${extension}`) > 255) shortened = shortened.slice(0, -1);
  safe = `${shortened || "file"}${extension}`;
  return safe;
}

export function isPotentiallyDangerousFileName(name: string): boolean {
  const extension = name.split(".").pop()?.toLowerCase(); return Boolean(extension && DANGEROUS.has(extension));
}

export function coarseDeviceLabel(userAgent: string): string {
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Firefox\//.test(userAgent) ? "Firefox" : /CriOS|Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const os = /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : /Windows/.test(userAgent) ? "Windows" : /Mac OS/.test(userAgent) ? "macOS" : "Device";
  return `${browser} · ${os}`;
}
