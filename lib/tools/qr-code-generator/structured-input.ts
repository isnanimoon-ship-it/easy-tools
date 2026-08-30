export type QrSourceType = "text" | "wifi" | "contact" | "email" | "phone" | "sms" | "location";

export type WifiFields = { ssid: string; password: string; security: "WPA" | "WEP" | "nopass"; hidden: boolean };
export type ContactFields = { firstName: string; lastName: string; phone: string; email: string };
export type EmailFields = { address: string; subject: string; body: string };
export type PhoneFields = { number: string };
export type SmsFields = { number: string; message: string };
export type LocationFields = { latitude: string; longitude: string };

function escapeWifiField(value: string): string {
  return value.replace(/([\\;,":])/g, "\\$1");
}

export function buildWifiPayload(fields: WifiFields): string {
  const ssid = fields.ssid.trim();
  if (!ssid) return "";

  const parts = [`T:${fields.security}`, `S:${escapeWifiField(ssid)}`];
  if (fields.security !== "nopass") parts.push(`P:${escapeWifiField(fields.password)}`);
  parts.push(`H:${fields.hidden ? "true" : "false"}`);
  return `WIFI:${parts.join(";")};;`;
}

function escapeVCardText(value: string): string {
  return value.replace(/([\\;,])/g, "\\$1");
}

export function buildContactPayload(fields: ContactFields): string {
  const firstName = fields.firstName.trim();
  const lastName = fields.lastName.trim();
  const phone = fields.phone.trim();
  const email = fields.email.trim();
  if (!firstName && !lastName && !phone && !email) return "";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCardText(lastName)};${escapeVCardText(firstName)};;;`,
    `FN:${escapeVCardText([firstName, lastName].filter(Boolean).join(" "))}`,
  ];
  if (phone) lines.push(`TEL:${phone}`);
  if (email) lines.push(`EMAIL:${email}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

export function buildEmailPayload(fields: EmailFields): string {
  const address = fields.address.trim();
  if (!address) return "";

  const params = new URLSearchParams();
  if (fields.subject) params.set("subject", fields.subject);
  if (fields.body) params.set("body", fields.body);
  const query = params.toString();
  return `mailto:${address}${query ? `?${query}` : ""}`;
}

export function buildPhonePayload(fields: PhoneFields): string {
  const number = fields.number.trim();
  return number ? `tel:${number}` : "";
}

export function buildSmsPayload(fields: SmsFields): string {
  const number = fields.number.trim();
  if (!number) return "";
  return `SMSTO:${number}:${fields.message}`;
}

export function buildLocationPayload(fields: LocationFields): string {
  if (fields.latitude.trim() === "" || fields.longitude.trim() === "") return "";
  const latitude = Number(fields.latitude);
  const longitude = Number(fields.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return "";
  return `geo:${latitude},${longitude}`;
}
