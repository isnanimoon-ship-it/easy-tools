import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IpInfoLookup, type IpInfoLabels, type LookupFunction } from "./ip-info";

const labels: IpInfoLabels = {
  currentTitle: "Current IP", manualTitle: "Lookup another IP", loading: "Loading", emptyResult: "Enter an IP", inputLabel: "IP address", inputHelp: "Public address", placeholder: "8.8.8.8", lookup: "Lookup", refresh: "Refresh", copy: "Copy IP", copied: "Copied", unknown: "Unknown", approximate: "Approximate location",
  fields: { ip: "Public IP", version: "Version", country: "Country", region: "Region", city: "City", isp: "ISP", organization: "Organization", asn: "ASN", timezone: "Timezone", continent: "Continent", postal: "Postal", coordinates: "Coordinates", callingCode: "Calling code" },
  errors: { "invalid-input": "Invalid", "non-public-ip": "Not public", offline: "Offline", timeout: "Timeout", "rate-limited": "Rate limited", "provider-unavailable": "Unavailable", "provider-rejected": "Rejected", "invalid-response": "Invalid response", "copy-failed": "Copy failed" },
  categories: { loopback: "Loopback", private: "Private", "link-local": "Link local", unspecified: "Unspecified", "carrier-grade-nat": "CGNAT", multicast: "Multicast", documentation: "Documentation", reserved: "Reserved" }, retryAfter: "Retry in {seconds}s",
};
const info = { ip: "8.8.8.8", version: "IPv4" as const, source: "current" as const, country: "United States", countryCode: "US", continent: "North America", continentCode: "NA", region: "California", city: "Mountain View", postalCode: null, latitude: 1, longitude: 2, isp: "Google", organization: "Google LLC", asn: "AS15169", timezone: "America/Los_Angeles", callingCode: "1", retrievedAt: "2026-01-01T00:00:00Z", provider: "ipwhois" as const };
afterEach(() => vi.restoreAllMocks());
describe("IpInfoLookup", () => {
  it("auto-loads current IP and renders normalized details", async () => {
    const lookup: LookupFunction = vi.fn().mockResolvedValue({ ok: true, value: info }); render(<IpInfoLookup labels={labels} lookup={lookup} />);
    expect(await screen.findByText("8.8.8.8")).toBeTruthy(); expect(screen.getByText("Google LLC")).toBeTruthy(); expect(lookup).toHaveBeenCalledWith("current", undefined, expect.anything());
  });
  it.each(["999.999.999.999", "example.com", "8.8.8.8/24"])("rejects invalid input without lookup: %s", async (input) => {
    const lookup: LookupFunction = vi.fn().mockResolvedValue({ ok: true, value: info }); render(<IpInfoLookup labels={labels} lookup={lookup} />); await screen.findByText("8.8.8.8"); vi.mocked(lookup).mockClear();
    fireEvent.change(screen.getByRole("textbox", { name: "IP address" }), { target: { value: input } }); fireEvent.click(screen.getByRole("button", { name: "Lookup" })); expect(screen.getByRole("alert").textContent).toContain("Invalid"); expect(lookup).not.toHaveBeenCalled();
  });
  it("classifies private IP without an external request", async () => {
    const lookup: LookupFunction = vi.fn().mockResolvedValue({ ok: true, value: info }); render(<IpInfoLookup labels={labels} lookup={lookup} />); await screen.findByText("8.8.8.8"); vi.mocked(lookup).mockClear();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "192.168.0.1" } }); fireEvent.submit(screen.getByRole("textbox").closest("form")!); expect(screen.getByRole("alert").textContent).toContain("Private"); expect(lookup).not.toHaveBeenCalled();
  });
  it("looks up canonical public IPv6 and displays rate-limit recovery", async () => {
    const lookup: LookupFunction = vi.fn().mockResolvedValueOnce({ ok: true, value: info }).mockResolvedValueOnce({ ok: false, reason: "rate-limited", retryAfterSeconds: 120 }); render(<IpInfoLookup labels={labels} lookup={lookup} />); await screen.findByText("8.8.8.8");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "2001:4860:4860::8888" } }); fireEvent.click(screen.getByRole("button", { name: "Lookup" })); expect((await screen.findByRole("alert")).textContent).toContain("120s"); expect(lookup).toHaveBeenLastCalledWith("manual", "2001:4860:4860:0:0:0:0:8888", expect.anything());
  });
  it("copies exact IP and handles denied permission", async () => {
    const lookup: LookupFunction = vi.fn().mockResolvedValue({ ok: true, value: info }); const writeText = vi.fn().mockResolvedValue(undefined); Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } }); render(<IpInfoLookup labels={labels} lookup={lookup} />); await screen.findByText("8.8.8.8");
    fireEvent.click(screen.getByRole("button", { name: "Copy IP" })); await waitFor(() => expect(writeText).toHaveBeenCalledWith("8.8.8.8")); expect(screen.getByText("Copied")).toBeTruthy();
    writeText.mockRejectedValueOnce(new Error("denied")); fireEvent.click(screen.getByRole("button", { name: "Copied" })); expect((await screen.findByRole("alert")).textContent).toContain("Copy failed"); expect(screen.getByText("8.8.8.8")).toBeTruthy();
  });
});
