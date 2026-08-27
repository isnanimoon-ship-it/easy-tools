import ipaddr from "ipaddr.js";

export type IpCategory =
  | "public"
  | "loopback"
  | "private"
  | "link-local"
  | "unspecified"
  | "carrier-grade-nat"
  | "multicast"
  | "documentation"
  | "reserved";

export type IpValidation =
  | { ok: true; address: string; version: "IPv4" | "IPv6"; category: IpCategory }
  | { ok: false; reason: "empty" | "invalid" };

const documentationCidrs = [
  ipaddr.parseCIDR("192.0.2.0/24"),
  ipaddr.parseCIDR("198.51.100.0/24"),
  ipaddr.parseCIDR("203.0.113.0/24"),
  ipaddr.parseCIDR("2001:db8::/32"),
] as const;

function categoryFor(address: ipaddr.IPv4 | ipaddr.IPv6): IpCategory {
  if (documentationCidrs.some((range) => address.kind() === range[0].kind() && address.match(range))) return "documentation";
  const range = address.range();
  if (range === "unicast") return "public";
  if (range === "loopback") return "loopback";
  if (range === "private" || range === "uniqueLocal") return "private";
  if (range === "linkLocal") return "link-local";
  if (range === "unspecified") return "unspecified";
  if (range === "carrierGradeNat") return "carrier-grade-nat";
  if (range === "multicast") return "multicast";
  return "reserved";
}

export function validateIpInput(input: string): IpValidation {
  const value = input.trim();
  if (!value) return { ok: false, reason: "empty" };
  if (value.length > 64 || /[\s/%]/.test(value) || value.includes("[") || value.includes("]")) return { ok: false, reason: "invalid" };
  if (value.includes(".") && !/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value) && !value.includes(":")) return { ok: false, reason: "invalid" };
  if (!ipaddr.isValid(value)) return { ok: false, reason: "invalid" };

  const parsed = ipaddr.parse(value);
  if (parsed.kind() === "ipv6" && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
    const mapped = (parsed as ipaddr.IPv6).toIPv4Address();
    return { ok: true, address: mapped.toString(), version: "IPv4", category: categoryFor(mapped) };
  }
  return {
    ok: true,
    address: parsed.toNormalizedString(),
    version: parsed.kind() === "ipv4" ? "IPv4" : "IPv6",
    category: categoryFor(parsed),
  };
}
