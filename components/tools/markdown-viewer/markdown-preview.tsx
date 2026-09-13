"use client";

import type { ComponentPropsWithoutRef } from "react";
import Markdown, { type Components, type UrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import { classifyMarkdownLink } from "@/lib/tools/markdown-viewer/url-policy";

type Props = { source: string; emptyLabel: string; blockedImageLabel: string; blockedLinkLabel: string };

const transformUrl: UrlTransform = (url, key) => {
  if (key === "src") return "";
  const link = classifyMarkdownLink(url);
  return link.kind === "blocked" ? "" : link.href;
};

export function MarkdownPreview({ source, emptyLabel, blockedImageLabel, blockedLinkLabel }: Props) {
  if (!source.trim()) return <p className="grid min-h-72 place-items-center text-center text-[var(--text-muted)]">{emptyLabel}</p>;

  const components: Components = {
    h1: ({ children }) => <h1 className="mb-4 mt-7 break-words text-3xl font-bold first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="mb-3 mt-7 break-words border-b border-[var(--border)] pb-2 text-2xl font-bold">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-2 mt-6 break-words text-xl font-bold">{children}</h3>,
    h4: ({ children }) => <h4 className="mb-2 mt-5 break-words text-lg font-bold">{children}</h4>,
    h5: ({ children }) => <h5 className="mb-2 mt-4 break-words font-bold">{children}</h5>,
    h6: ({ children }) => <h6 className="mb-2 mt-4 break-words font-bold text-[var(--text-muted)]">{children}</h6>,
    p: ({ children }) => <p className="my-3 break-words leading-7">{children}</p>,
    ul: ({ children, className }) => <ul className={`my-4 space-y-1 pl-6 ${className?.includes("contains-task-list") ? "list-none pl-1" : "list-disc"}`}>{children}</ul>,
    ol: ({ children }) => <ol className="my-4 list-decimal space-y-1 pl-6">{children}</ol>,
    li: ({ children }) => <li className="break-words leading-7">{children}</li>,
    blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-[var(--primary)] bg-[var(--surface-muted)] px-4 py-1 text-[var(--text-muted)]">{children}</blockquote>,
    hr: () => <hr className="my-7 border-[var(--border)]" />,
    table: ({ children }) => <div className="my-5 max-w-full overflow-x-auto"><table className="w-full min-w-[32rem] border-collapse text-left text-sm">{children}</table></div>,
    th: ({ children }) => <th className="border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 font-bold">{children}</th>,
    td: ({ children }) => <td className="border border-[var(--border)] px-3 py-2 align-top">{children}</td>,
    pre: ({ children }) => <pre className="my-4 max-w-full overflow-x-auto rounded-xl bg-[var(--code-bg)] p-4 text-sm leading-6 text-[var(--code-fg)]">{children}</pre>,
    code: ({ children, className }) => className
      ? <code className={className}>{children}</code>
      : <code className="rounded bg-[var(--code-bg)] px-1.5 py-0.5 text-sm text-[var(--code-fg)]">{children}</code>,
    a: ({ href, children }) => {
      const link = classifyMarkdownLink(href);
      if (link.kind === "blocked") return <span className="break-all text-[var(--text-muted)]" title={blockedLinkLabel}>{children}</span>;
      return <a href={link.href} target={link.kind === "external" ? "_blank" : undefined} rel={link.kind === "external" ? "noopener noreferrer nofollow" : undefined} className="break-all font-semibold text-[var(--primary)] underline underline-offset-2">{children}</a>;
    },
    img: ({ alt }: ComponentPropsWithoutRef<"img">) => <span role="note" className="my-3 block break-words rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]">{alt ? `${alt} — ` : ""}{blockedImageLabel}</span>,
    input: (props) => <input {...props} type="checkbox" disabled readOnly className="mr-2 size-4 align-middle accent-[var(--primary)]" />,
  };

  return <div className="min-w-0 text-[var(--foreground)]"><Markdown remarkPlugins={[remarkGfm]} skipHtml urlTransform={transformUrl} components={components}>{source}</Markdown></div>;
}
