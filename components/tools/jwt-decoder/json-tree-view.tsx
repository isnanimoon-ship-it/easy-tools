"use client";

import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { useMemo, useState } from "react";

import { buildJsonTree, copyableText, type JsonTreeNode } from "@/lib/tools/jwt-decoder/json-tree";

export type JsonTreeLabels = {
  expandNode: string;
  collapseNode: string;
  copyValue: string;
  copied: string;
};

const TOKEN_STYLES = {
  key: "text-[var(--info-fg)] font-semibold",
  string: "text-[var(--primary)]",
  number: "text-[var(--warning-fg)]",
  boolean: "text-[var(--warning-fg)]",
  null: "text-[var(--text-muted)]",
  punctuation: "text-[var(--foreground)]",
  muted: "text-[var(--text-muted)]",
};

function primitiveText(node: JsonTreeNode): { text: string; style: string } {
  switch (node.kind) {
    case "string":
      return { text: JSON.stringify(node.value), style: TOKEN_STYLES.string };
    case "number":
      return { text: String(node.value), style: TOKEN_STYLES.number };
    case "boolean":
      return { text: String(node.value), style: TOKEN_STYLES.boolean };
    case "null":
      return { text: "null", style: TOKEN_STYLES.null };
  }
  return { text: "", style: "" };
}

function containerBrackets(node: JsonTreeNode): { open: string; close: string } {
  return node.kind === "array" ? { open: "[", close: "]" } : { open: "{", close: "}" };
}

function childCount(node: JsonTreeNode): number {
  return node.kind === "array" ? node.items.length : node.kind === "object" ? node.entries.length : 0;
}

function CopyButton({ node, labels, copiedId, onCopy }: { node: JsonTreeNode; labels: JsonTreeLabels; copiedId: string | null; onCopy: (node: JsonTreeNode) => void }) {
  const copied = copiedId === node.id;
  return (
    <button
      type="button"
      onClick={() => onCopy(node)}
      aria-label={copied ? labels.copied : labels.copyValue}
      className="shrink-0 rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
    >
      {copied ? <Check size={13} aria-hidden="true" className="text-[var(--success-fg)]" /> : <Copy size={13} aria-hidden="true" />}
    </button>
  );
}

type RowProps = {
  node: JsonTreeNode;
  keyName: string | null;
  depth: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  copiedId: string | null;
  onCopy: (node: JsonTreeNode) => void;
  labels: JsonTreeLabels;
  trailingComma: boolean;
};

function JsonNodeRow({ node, keyName, depth, collapsed, onToggle, copiedId, onCopy, labels, trailingComma }: RowProps) {
  const isContainer = node.kind === "object" || node.kind === "array";
  const isCollapsed = isContainer && collapsed.has(node.id);
  const style = { paddingLeft: depth * 16 };
  const keyElement = keyName !== null ? <span className={TOKEN_STYLES.key}>{JSON.stringify(keyName)}</span> : null;

  if (!isContainer) {
    const { text, style: valueStyle } = primitiveText(node);
    return (
      <div style={style} className="flex items-start gap-1 whitespace-pre font-mono text-sm leading-6">
        <span>
          {keyElement}
          {keyElement ? <span className={TOKEN_STYLES.punctuation}>: </span> : null}
          <span className={valueStyle}>{text}</span>
          {trailingComma ? <span className={TOKEN_STYLES.punctuation}>,</span> : null}
        </span>
        <CopyButton node={node} labels={labels} copiedId={copiedId} onCopy={onCopy} />
      </div>
    );
  }

  const { open, close } = containerBrackets(node);
  const count = childCount(node);
  const entries = node.kind === "object" ? node.entries : node.items.map((item, index) => ({ key: String(index), value: item }));

  return (
    <div>
      <div style={style} className="flex items-start gap-1 whitespace-pre font-mono text-sm leading-6">
        <button
          type="button"
          onClick={() => onToggle(node.id)}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? labels.expandNode : labels.collapseNode}
          className="mt-0.5 shrink-0 rounded text-[var(--text-muted)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        >
          {isCollapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
        <span>
          {keyElement}
          {keyElement ? <span className={TOKEN_STYLES.punctuation}>: </span> : null}
          <span className={TOKEN_STYLES.punctuation}>{open}</span>
          {isCollapsed ? (
            <>
              <span className={TOKEN_STYLES.muted}> …{count} </span>
              <span className={TOKEN_STYLES.punctuation}>{close}</span>
              {trailingComma ? <span className={TOKEN_STYLES.punctuation}>,</span> : null}
            </>
          ) : count === 0 ? (
            <>
              <span className={TOKEN_STYLES.punctuation}>{close}</span>
              {trailingComma ? <span className={TOKEN_STYLES.punctuation}>,</span> : null}
            </>
          ) : null}
        </span>
        <CopyButton node={node} labels={labels} copiedId={copiedId} onCopy={onCopy} />
      </div>
      {!isCollapsed && count > 0
        ? entries.map((entry, index) => (
            <JsonNodeRow
              key={entry.value.id}
              node={entry.value}
              keyName={node.kind === "object" ? entry.key : null}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              copiedId={copiedId}
              onCopy={onCopy}
              labels={labels}
              trailingComma={index < entries.length - 1}
            />
          ))
        : null}
      {!isCollapsed && count > 0 ? (
        <div style={style} className="whitespace-pre font-mono text-sm leading-6">
          <span className={TOKEN_STYLES.punctuation}>{close}</span>
          {trailingComma ? <span className={TOKEN_STYLES.punctuation}>,</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function JsonTreeView({ value, labels }: { value: unknown; labels: JsonTreeLabels }) {
  const tree = useMemo(() => buildJsonTree(value), [value]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function toggle(id: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copy(node: JsonTreeNode) {
    try {
      await navigator.clipboard.writeText(copyableText(node));
      setCopiedId(node.id);
      setTimeout(() => setCopiedId((current) => (current === node.id ? null : current)), 1500);
    } catch {
      // Clipboard API can be unavailable (insecure context, permission denied); the
      // button simply stays unconfirmed, matching this tool's other copy buttons.
    }
  }

  return (
    <div className="max-h-96 overflow-auto rounded-xl bg-[var(--surface-muted)] p-4">
      <JsonNodeRow node={tree} keyName={null} depth={0} collapsed={collapsed} onToggle={toggle} copiedId={copiedId} onCopy={copy} labels={labels} trailingComma={false} />
    </div>
  );
}
