export type LookupSource = "current" | "manual";
export type IpInfo = {
  ip: string; version: "IPv4" | "IPv6"; source: LookupSource;
  country: string | null; countryCode: string | null; continent: string | null; continentCode: string | null;
  region: string | null; city: string | null; postalCode: string | null; latitude: number | null; longitude: number | null;
  isp: string | null; organization: string | null; asn: string | null; timezone: string | null; callingCode: string | null;
  retrievedAt: string; provider: "ipwhois";
};

export type LookupErrorCode = "offline" | "timeout" | "rate-limited" | "provider-unavailable" | "provider-rejected" | "invalid-response";
export type LookupResult = { ok: true; value: IpInfo } | { ok: false; reason: LookupErrorCode; retryAfterSeconds?: number };
type FetchLike = typeof fetch;

const text = (value: unknown, max = 200) => typeof value === "string" && value.length <= max && value.trim() ? value.trim() : null;
const coordinate = (value: unknown, min: number, max: number) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function normalizeIpWhoisResponse(raw: unknown, source: LookupSource, now = new Date()): IpInfo | null {
  const root = object(raw); if (!root || root.success !== true) return null;
  const ip = text(root.ip, 64); const version = root.type;
  if (!ip || (version !== "IPv4" && version !== "IPv6")) return null;
  const connection = object(root.connection); const timezone = object(root.timezone);
  if (root.country_code != null && (typeof root.country_code !== "string" || !/^[A-Za-z]{2}$/.test(root.country_code))) return null;
  const countryCode = text(root.country_code, 2);
  const asnValue = connection?.asn;
  const asn = typeof asnValue === "number" && Number.isInteger(asnValue) && asnValue >= 0 ? `AS${asnValue}` : text(asnValue, 20);
  return {
    ip, version, source, country: text(root.country), countryCode: countryCode?.toUpperCase() ?? null,
    continent: text(root.continent), continentCode: text(root.continent_code, 3), region: text(root.region), city: text(root.city),
    postalCode: text(root.postal, 32), latitude: coordinate(root.latitude, -90, 90), longitude: coordinate(root.longitude, -180, 180),
    isp: text(connection?.isp), organization: text(connection?.org), asn, timezone: text(timezone?.id), callingCode: text(root.calling_code, 16),
    retrievedAt: now.toISOString(), provider: "ipwhois",
  };
}

function retryAfter(headers: Headers): number | undefined {
  const raw = headers.get("Retry-After"); if (!raw) return undefined;
  const seconds = Number(raw); return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : undefined;
}

export async function lookupIp(source: LookupSource, ip?: string, options: { fetcher?: FetchLike; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<LookupResult> {
  const fetcher = options.fetcher ?? fetch; const controller = new AbortController(); const timeoutMs = options.timeoutMs ?? 8_000;
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  const abort = () => controller.abort("cancelled"); options.signal?.addEventListener("abort", abort, { once: true });
  try {
    const url = ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : "https://ipwho.is/";
    const response = await fetcher(url, { method: "GET", signal: controller.signal, headers: { Accept: "application/json" } });
    if (response.status === 429) return { ok: false, reason: "rate-limited", retryAfterSeconds: retryAfter(response.headers) };
    if (response.status >= 500) return { ok: false, reason: "provider-unavailable" };
    if (!response.ok) return { ok: false, reason: "provider-rejected" };
    let raw: unknown; try { raw = await response.json(); } catch { return { ok: false, reason: "invalid-response" }; }
    const root = object(raw);
    if (root?.success === false) return { ok: false, reason: "provider-rejected" };
    const value = normalizeIpWhoisResponse(raw, source);
    return value ? { ok: true, value } : { ok: false, reason: "invalid-response" };
  } catch (error) {
    if (controller.signal.aborted && controller.signal.reason === "timeout") return { ok: false, reason: "timeout" };
    if (options.signal?.aborted) throw error;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, reason: "offline" };
    return { ok: false, reason: "provider-unavailable" };
  } finally {
    clearTimeout(timeout); options.signal?.removeEventListener("abort", abort);
  }
}
