import { describe, expect, it } from "vitest";
import { validateIpInput } from "./ip-address";

describe("validateIpInput", () => {
  it.each([["8.8.8.8", "IPv4"], [" 1.1.1.1 ", "IPv4"], ["2001:4860:4860::8888", "IPv6"]])("accepts public %s", (input, version) => {
    expect(validateIpInput(input)).toMatchObject({ ok: true, version, category: "public" });
  });
  it.each(["", " ", "999.999.999.999", "192.168.1", "2001:::1", "https://8.8.8.8", "8.8.8.8:53", "8.8.8.8/24", "example.com", "[2001:4860::1]:443"])("rejects invalid %s", (input) => expect(validateIpInput(input).ok).toBe(false));
  it.each([
    ["127.0.0.1", "loopback"], ["::1", "loopback"], ["10.0.0.1", "private"], ["172.16.0.1", "private"], ["192.168.0.1", "private"], ["fc00::1", "private"],
    ["169.254.1.1", "link-local"], ["fe80::1", "link-local"], ["100.64.0.1", "carrier-grade-nat"], ["192.0.2.1", "documentation"], ["2001:db8::1", "documentation"],
    ["224.0.0.1", "multicast"], ["ff02::1", "multicast"], ["0.0.0.0", "unspecified"], ["::", "unspecified"],
  ])("classifies %s as %s", (input, category) => expect(validateIpInput(input)).toMatchObject({ ok: true, category }));
  it("normalizes IPv4-mapped IPv6", () => expect(validateIpInput("::ffff:8.8.8.8")).toMatchObject({ ok: true, address: "8.8.8.8", version: "IPv4", category: "public" }));
});
