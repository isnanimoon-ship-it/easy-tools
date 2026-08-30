export type QueryParam = { key: string; value: string };

export type ParsedQuery = { base: string | null; params: QueryParam[] };

export function parseQueryInput(input: string): ParsedQuery {
  const trimmed = input.trim();
  if (!trimmed) return { base: null, params: [] };

  try {
    const url = new URL(trimmed);
    return { base: url.origin + url.pathname, params: [...url.searchParams].map(([key, value]) => ({ key, value })) };
  } catch {
    return { base: null, params: [...new URLSearchParams(trimmed)].map(([key, value]) => ({ key, value })) };
  }
}

export function buildQueryOutput(base: string | null, params: QueryParam[]): string {
  const search = new URLSearchParams();
  for (const { key, value } of params) {
    if (key === "") continue;
    search.append(key, value);
  }

  const query = search.toString();
  if (base) return query ? `${base}?${query}` : base;
  return query;
}
