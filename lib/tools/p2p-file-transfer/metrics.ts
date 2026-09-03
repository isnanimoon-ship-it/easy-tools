import type { TransferMetrics } from "./model";

export type SpeedSample = { at: number; bytes: number };

export function calculateMetrics(samples: SpeedSample[], bytes: number, total: number, now = Date.now()): TransferMetrics {
  const recent = [...samples, { at: now, bytes }].filter(sample => now - sample.at <= 5000).sort((a, b) => a.at - b.at);
  const first = recent[0], last = recent.at(-1); const elapsed = first && last ? (last.at - first.at) / 1000 : 0;
  const speed = recent.length >= 3 && elapsed > 0 ? Math.max(0, (last!.bytes - first!.bytes) / elapsed) : null;
  const remaining = Math.max(0, total - bytes);
  return { bytes, total, progress: total === 0 ? 100 : Math.min(100, Math.max(0, bytes / total * 100)), bytesPerSecond: speed, etaSeconds: speed && speed >= 32 * 1024 ? remaining / speed : null };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"]; let value = bytes, index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
  return `${value.toLocaleString(undefined, { maximumFractionDigits: index ? 2 : 0 })} ${units[index]}`;
}
