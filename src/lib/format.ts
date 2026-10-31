const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
const BYTE_STEP = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const PERCENT_BASE = 100;

export function formatBytes(bytes: number, locale: string): string {
  let value = bytes;
  let unitIndex = 0;
  while (value >= BYTE_STEP && unitIndex < BYTE_UNITS.length - 1) {
    value /= BYTE_STEP;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 ? 0 : 1;
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return `${number} ${BYTE_UNITS[unitIndex]}`;
}

export function formatSpeed(bytesPerSec: number, locale: string): string {
  return `${formatBytes(bytesPerSec, locale)}/s`;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const rest = String(seconds % SECONDS_PER_MINUTE).padStart(2, "0");
  if (hours === 0) return `${minutes}:${rest}`;
  return `${hours}:${String(minutes).padStart(2, "0")}:${rest}`;
}

export function formatPercent(percent: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(percent / PERCENT_BASE);
}
