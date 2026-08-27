import { describe, expect, it, vi } from "vitest";
import { lookupIp, normalizeIpWhoisResponse } from "./provider";

const payload = { success: true, ip: "8.8.8.8", type: "IPv4", continent: "North America", continent_code: "NA", country: "United States", country_code: "US", region: "California", city: "Mountain View", postal: "94043", latitude: 37.4, longitude: -122.1, calling_code: "1", connection: { asn: 15169, org: "Google LLC", isp: "Google" }, timezone: { id: "America/Los_Angeles" } };
describe("IP provider", () => {
  it("normalizes a valid response", () => expect(normalizeIpWhoisResponse(payload, "manual", new Date("2026-01-01T00:00:00Z"))).toMatchObject({ ip: "8.8.8.8", asn: "AS15169", countryCode: "US", source: "manual", provider: "ipwhois" }));
  it.each([null, {}, { ...payload, success: false }, { ...payload, ip: null }, { ...payload, type: "v4" }, { ...payload, country_code: "USA" }])("rejects invalid runtime data", (value) => expect(normalizeIpWhoisResponse(value, "current")).toBeNull());
  it("uses current and encoded manual endpoints", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    expect((await lookupIp("current", undefined, { fetcher })).ok).toBe(true);
    await lookupIp("manual", "2001:4860::8888", { fetcher });
    expect(fetcher.mock.calls[0][0]).toBe("https://ipwho.is/"); expect(fetcher.mock.calls[1][0]).toBe("https://ipwho.is/2001%3A4860%3A%3A8888");
  });
  it.each([[429, "rate-limited"], [500, "provider-unavailable"], [403, "provider-rejected"]])("maps HTTP %s", async (status, reason) => {
    const headers = status === 429 ? { "Retry-After": "120" } : undefined; const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status, headers }));
    expect(await lookupIp("current", undefined, { fetcher })).toMatchObject({ ok: false, reason });
  });
  it("handles malformed JSON, application rejection and timeout", async () => {
    expect(await lookupIp("current", undefined, { fetcher: vi.fn().mockResolvedValue(new Response("html")) })).toMatchObject({ reason: "invalid-response" });
    expect(await lookupIp("current", undefined, { fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }))) })).toMatchObject({ reason: "provider-rejected" });
    const never: typeof fetch = (_input, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    expect(await lookupIp("current", undefined, { fetcher: never, timeoutMs: 1 })).toMatchObject({ reason: "timeout" });
  });
});
