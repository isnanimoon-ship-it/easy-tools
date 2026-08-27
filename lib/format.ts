import type { AppLocale } from "@/i18n/routing";

export function formatDate(
  value: Date | number | string,
  locale: AppLocale,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

export function formatNumber(
  value: number,
  locale: AppLocale,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatFileSize(bytes: number, locale: AppLocale) {
  const safeBytes = Math.max(0, bytes);
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  const unitIndex =
    safeBytes === 0
      ? 0
      : Math.min(Math.floor(Math.log(safeBytes) / Math.log(1024)), 3);
  const value = safeBytes / 1024 ** unitIndex;

  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: units[unitIndex],
    unitDisplay: "short",
    maximumFractionDigits: unitIndex === 0 ? 0 : 2,
  }).format(value);
}
