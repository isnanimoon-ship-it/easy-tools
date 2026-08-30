import { describe, expect, it } from "vitest";

import {
  buildContactPayload,
  buildEmailPayload,
  buildLocationPayload,
  buildPhonePayload,
  buildSmsPayload,
  buildWifiPayload,
} from "./structured-input";

describe("buildWifiPayload", () => {
  it("returns an empty string when the SSID is blank", () => {
    expect(buildWifiPayload({ ssid: "", password: "x", security: "WPA", hidden: false })).toBe("");
    expect(buildWifiPayload({ ssid: "   ", password: "x", security: "WPA", hidden: false })).toBe("");
  });

  it("builds a standard WPA payload", () => {
    expect(buildWifiPayload({ ssid: "HomeNet", password: "secret123", security: "WPA", hidden: false })).toBe(
      "WIFI:T:WPA;S:HomeNet;P:secret123;H:false;;",
    );
  });

  it("omits the password field for an open network", () => {
    expect(buildWifiPayload({ ssid: "OpenNet", password: "ignored", security: "nopass", hidden: false })).toBe(
      "WIFI:T:nopass;S:OpenNet;H:false;;",
    );
  });

  it("marks a hidden network", () => {
    expect(buildWifiPayload({ ssid: "Hidden", password: "p", security: "WEP", hidden: true })).toBe(
      "WIFI:T:WEP;S:Hidden;P:p;H:true;;",
    );
  });

  it("escapes reserved characters in the SSID and password", () => {
    expect(buildWifiPayload({ ssid: 'a;b,c:d"e\\f', password: "p;q", security: "WPA", hidden: false })).toBe(
      'WIFI:T:WPA;S:a\\;b\\,c\\:d\\"e\\\\f;P:p\\;q;H:false;;',
    );
  });
});

describe("buildContactPayload", () => {
  it("returns an empty string when every field is blank", () => {
    expect(buildContactPayload({ firstName: "", lastName: "", phone: "", email: "" })).toBe("");
    expect(buildContactPayload({ firstName: "  ", lastName: "", phone: "", email: "" })).toBe("");
  });

  it("builds a vCard with name, phone, and email", () => {
    expect(buildContactPayload({ firstName: "Ada", lastName: "Lovelace", phone: "+1234567890", email: "ada@example.com" })).toBe(
      "BEGIN:VCARD\nVERSION:3.0\nN:Lovelace;Ada;;;\nFN:Ada Lovelace\nTEL:+1234567890\nEMAIL:ada@example.com\nEND:VCARD",
    );
  });

  it("omits TEL and EMAIL lines when those fields are blank", () => {
    expect(buildContactPayload({ firstName: "Ada", lastName: "", phone: "", email: "" })).toBe(
      "BEGIN:VCARD\nVERSION:3.0\nN:;Ada;;;\nFN:Ada\nEND:VCARD",
    );
  });

  it("escapes reserved characters in the name", () => {
    expect(buildContactPayload({ firstName: "A;B,C\\D", lastName: "", phone: "", email: "" })).toBe(
      "BEGIN:VCARD\nVERSION:3.0\nN:;A\\;B\\,C\\\\D;;;\nFN:A\\;B\\,C\\\\D\nEND:VCARD",
    );
  });
});

describe("buildEmailPayload", () => {
  it("returns an empty string when the address is blank", () => {
    expect(buildEmailPayload({ address: "", subject: "hi", body: "there" })).toBe("");
  });

  it("builds a bare mailto link with no subject or body", () => {
    expect(buildEmailPayload({ address: "a@example.com", subject: "", body: "" })).toBe("mailto:a@example.com");
  });

  it("appends a URL-encoded subject and body", () => {
    expect(buildEmailPayload({ address: "a@example.com", subject: "Hello there", body: "Line 1 & 2" })).toBe(
      "mailto:a@example.com?subject=Hello+there&body=Line+1+%26+2",
    );
  });
});

describe("buildPhonePayload", () => {
  it("returns an empty string when the number is blank", () => {
    expect(buildPhonePayload({ number: "" })).toBe("");
  });

  it("builds a tel: link", () => {
    expect(buildPhonePayload({ number: "+1 234 567 890" })).toBe("tel:+1 234 567 890");
  });
});

describe("buildSmsPayload", () => {
  it("returns an empty string when the number is blank", () => {
    expect(buildSmsPayload({ number: "", message: "hi" })).toBe("");
  });

  it("builds an SMSTO: payload with a message", () => {
    expect(buildSmsPayload({ number: "+1234567890", message: "Hello" })).toBe("SMSTO:+1234567890:Hello");
  });

  it("allows an empty message", () => {
    expect(buildSmsPayload({ number: "+1234567890", message: "" })).toBe("SMSTO:+1234567890:");
  });
});

describe("buildLocationPayload", () => {
  it("returns an empty string when either coordinate is blank", () => {
    expect(buildLocationPayload({ latitude: "", longitude: "10" })).toBe("");
    expect(buildLocationPayload({ latitude: "10", longitude: "" })).toBe("");
  });

  it("returns an empty string for a non-numeric coordinate", () => {
    expect(buildLocationPayload({ latitude: "abc", longitude: "10" })).toBe("");
  });

  it("returns an empty string for an out-of-range coordinate", () => {
    expect(buildLocationPayload({ latitude: "91", longitude: "10" })).toBe("");
    expect(buildLocationPayload({ latitude: "10", longitude: "181" })).toBe("");
    expect(buildLocationPayload({ latitude: "-91", longitude: "10" })).toBe("");
  });

  it("builds a geo: URI for valid coordinates", () => {
    expect(buildLocationPayload({ latitude: "37.5665", longitude: "126.978" })).toBe("geo:37.5665,126.978");
  });

  it("accepts boundary coordinates", () => {
    expect(buildLocationPayload({ latitude: "90", longitude: "180" })).toBe("geo:90,180");
    expect(buildLocationPayload({ latitude: "-90", longitude: "-180" })).toBe("geo:-90,-180");
  });
});
