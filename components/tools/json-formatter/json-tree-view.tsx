"use client";

import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { buildJsonTree, collectKeyMatches, type JsonTreeNode } from "@/lib/tools/json-formatter/json-tree";

export type JsonTreeLabels = {
  expandAll: string;
  collapseAll: string;
  expandNode: string;
  collapseNode: string;
  searchLabel: string;
  searchPlaceholder: string;
  matchCount: string;
  noMatches: string;
  prevMatch: string;
  nextMatch: string;
  itemCount: string;
};

const TOKEN_STYLES = {
  key: "text-[var(--info-fg)] font-semibold",
  string: "text-[var(--primary)]",
  number: "text-[var(--warning-fg)]",
  boolean: "text-[var(--warning-fg)]",
  null: "text-[var(--text-muted)]",
  punctuation: "text-[var(--foreground)] font-semibold",
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

type RowProps = {
  node: JsonTreeNode;
  keyName: string | null;
  depth: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  matchIds: Set<string>;
  activeMatchId: string | null;
  labels: JsonTreeLabels;
  trailingComma: boolean;
};

function JsonNodeRow({ node, keyName, depth, collapsed, onToggle, matchIds, activeMatchId, labels, trailingComma }: RowProps) {
  const isContainer = node.kind === "object" || node.kind === "array";
  const isCollapsed = isContainer && collapsed.has(node.id);
  const isMatch = keyName !== null && matchIds.has(node.id);
  const isActiveMatch = keyName !== null && node.id === activeMatchId;
  const style = { paddingLeft: depth * 16 };

  const keyElement = keyName !== null ? (
    <span
      className={`${TOKEN_STYLES.key} ${
        isActiveMatch
          ? "rounded bg-[var(--warning-border)] px-0.5 text-[var(--warning-fg)]"
          : isMatch
            ? "rounded bg-[var(--warning-bg)] px-0.5 ring-1 ring-inset ring-[var(--warning-border)]"
            : ""
      }`}
    >
      {JSON.stringify(keyName)}
    </span>
  ) : null;

  if (!isContainer) {
    const { text, style: valueStyle } = primitiveText(node);
    return (
      <div data-node-id={node.id} style={style} className="whitespace-pre font-mono text-sm leading-6">
        {keyElement}
        {keyElement ? <span className={TOKEN_STYLES.punctuation}>: </span> : null}
        <span className={valueStyle}>{text}</span>
        {trailingComma ? <span className={TOKEN_STYLES.punctuation}>,</span> : null}
      </div>
    );
  }

  const { open, close } = containerBrackets(node);
  const count = childCount(node);
  const entries = node.kind === "object" ? node.entries : node.items.map((item, index) => ({ key: String(index), value: item }));

  return (
    <div data-node-id={node.id}>
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
              <span className={TOKEN_STYLES.muted}> {labels.itemCount.replace("__COUNT__", String(count))} </span>
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
              matchIds={matchIds}
              activeMatchId={activeMatchId}
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

function collectContainerIds(node: JsonTreeNode, out: string[]) {
  if (node.kind === "object") {
    out.push(node.id);
    node.entries.forEach((entry) => collectContainerIds(entry.value, out));
  } else if (node.kind === "array") {
    out.push(node.id);
    node.items.forEach((item) => collectContainerIds(item, out));
  }
}

export function JsonTreeView({ value, labels }: { value: unknown; labels: JsonTreeLabels }) {
  const tree = useMemo(() => buildJsonTree(value), [value]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [settledQuery, setSettledQuery] = useState(query);

  const matches = useMemo(() => collectKeyMatches(tree, query), [tree, query]);
  const effectiveMatchIndex = query === settledQuery ? activeMatchIndex : 0;
  const activeMatch = matches.length > 0 ? matches[effectiveMatchIndex % matches.length] : null;
  const matchIds = useMemo(() => new Set(matches.map((match) => match.id)), [matches]);

  if (query !== settledQuery) {
    setSettledQuery(query);
    setActiveMatchIndex(0);
  }

  const [expandedForMatchId, setExpandedForMatchId] = useState<string | null>(null);
  if (activeMatch && activeMatch.id !== expandedForMatchId) {
    setExpandedForMatchId(activeMatch.id);
    setCollapsed((previous) => {
      const next = new Set(previous);
      let changed = false;
      for (const ancestorId of activeMatch.ancestorIds) {
        if (next.delete(ancestorId)) changed = true;
      }
      return changed ? next : previous;
    });
  }

  useEffect(() => {
    if (!activeMatch) return;
    const element = Array.from(document.querySelectorAll<HTMLElement>("[data-node-id]")).find(
      (candidate) => candidate.dataset.nodeId === activeMatch.id,
    );
    if (typeof element?.scrollIntoView === "function") element.scrollIntoView({ block: "nearest" });
  }, [activeMatch]);

  function toggle(id: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    const ids: string[] = [];
    collectContainerIds(tree, ids);
    setCollapsed(new Set(ids));
  }

  function goToMatch(offset: number) {
    if (matches.length === 0) return;
    setActiveMatchIndex((previous) => (previous + offset + matches.length) % matches.length);
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="json-tree-search" className="sr-only">
          {labels.searchLabel}
        </label>
        <input
          id="json-tree-search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.searchPlaceholder}
          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--focus-ring)]"
        />
        {query.trim() ? (
          <div className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
            <span>{matches.length === 0 ? labels.noMatches : labels.matchCount.replace("__INDEX__", String(activeMatchIndex + 1)).replace("__TOTAL__", String(matches.length))}</span>
            <button
              type="button"
              onClick={() => goToMatch(-1)}
              disabled={matches.length === 0}
              aria-label={labels.prevMatch}
              className="rounded p-1 hover:bg-[var(--surface)] disabled:opacity-40"
            >
              <ChevronUp size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => goToMatch(1)}
              disabled={matches.length === 0}
              aria-label={labels.nextMatch}
              className="rounded p-1 hover:bg-[var(--surface)] disabled:opacity-40"
            >
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={expandAll} className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--primary)] hover:underline">
            {labels.expandAll}
          </button>
          <button type="button" onClick={collapseAll} className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--primary)] hover:underline">
            {labels.collapseAll}
          </button>
        </div>
      </div>
      <div className="mt-3 max-h-[32rem] overflow-auto">
        <JsonNodeRow
          node={tree}
          keyName={null}
          depth={0}
          collapsed={collapsed}
          onToggle={toggle}
          matchIds={matchIds}
          activeMatchId={activeMatch?.id ?? null}
          labels={labels}
          trailingComma={false}
        />
      </div>
    </div>
  );
}
