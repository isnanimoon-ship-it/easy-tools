const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export type MarkdownLink = { kind: "external" | "fragment"; href: string } | { kind: "blocked" };

export function classifyMarkdownLink(href?: string): MarkdownLink {
  if (!href) return { kind: "blocked" };
  const value = href.trim();
  if (value.startsWith("#") && !value.includes("\n") && !value.includes("\r")) return { kind: "fragment", href: value };
  try {
    const url = new URL(value);
    return SAFE_PROTOCOLS.has(url.protocol.toLocaleLowerCase()) ? { kind: "external", href: url.href } : { kind: "blocked" };
  } catch {
    return { kind: "blocked" };
  }
}
