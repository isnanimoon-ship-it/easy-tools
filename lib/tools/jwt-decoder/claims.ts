export type TimeClaimResult =
  | { present: false }
  | { present: true; valid: false }
  | {
      present: true;
      valid: true;
      seconds: number;
      local: string;
      utc: string;
      relative: string;
    };

export type ExpirationStatus = "none" | "invalid" | "not-expired" | "expired";
export type NotBeforeStatus = "none" | "invalid" | "active" | "not-yet-active";

export type ClaimsAnalysis = {
  iss?: unknown;
  sub?: unknown;
  aud?: unknown;
  jti?: unknown;
  exp: TimeClaimResult;
  iat: TimeClaimResult;
  nbf: TimeClaimResult;
  expirationStatus: ExpirationStatus;
  notBeforeStatus: NotBeforeStatus;
  iatInFuture: boolean;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatLocal(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${datePart} ${timePart} (UTC${offset})`;
}

function formatUtc(date: Date): string {
  const datePart = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  const timePart = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  return `${datePart} ${timePart} UTC`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

function formatRelative(targetMs: number, nowMs: number, locale: string): string {
  const diffSeconds = Math.round((targetMs - nowMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diffSeconds);
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (abs >= secondsInUnit || unit === "second") {
      return rtf.format(Math.round(diffSeconds / secondsInUnit), unit);
    }
  }
  return rtf.format(0, "second");
}

function formatTimeClaim(raw: unknown, nowMs: number, locale: string): TimeClaimResult {
  if (raw === undefined) return { present: false };
  if (typeof raw !== "number" || !Number.isFinite(raw)) return { present: true, valid: false };
  const date = new Date(raw * 1000);
  if (Number.isNaN(date.getTime())) return { present: true, valid: false };
  return {
    present: true,
    valid: true,
    seconds: raw,
    local: formatLocal(date),
    utc: formatUtc(date),
    relative: formatRelative(date.getTime(), nowMs, locale),
  };
}

function expirationStatus(exp: TimeClaimResult, nowMs: number): ExpirationStatus {
  if (!exp.present) return "none";
  if (!exp.valid) return "invalid";
  return exp.seconds * 1000 > nowMs ? "not-expired" : "expired";
}

function notBeforeStatus(nbf: TimeClaimResult, nowMs: number): NotBeforeStatus {
  if (!nbf.present) return "none";
  if (!nbf.valid) return "invalid";
  return nbf.seconds * 1000 <= nowMs ? "active" : "not-yet-active";
}

function isIatInFuture(iat: TimeClaimResult, nowMs: number): boolean {
  return iat.present && iat.valid && iat.seconds * 1000 > nowMs;
}

export function analyzeClaims(
  payload: unknown,
  nowMs: number = Date.now(),
  locale = "en",
): ClaimsAnalysis | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const exp = formatTimeClaim(record.exp, nowMs, locale);
  const iat = formatTimeClaim(record.iat, nowMs, locale);
  const nbf = formatTimeClaim(record.nbf, nowMs, locale);
  return {
    iss: record.iss,
    sub: record.sub,
    aud: record.aud,
    jti: record.jti,
    exp,
    iat,
    nbf,
    expirationStatus: expirationStatus(exp, nowMs),
    notBeforeStatus: notBeforeStatus(nbf, nowMs),
    iatInFuture: isIatInFuture(iat, nowMs),
  };
}
