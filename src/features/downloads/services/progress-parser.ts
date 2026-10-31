import { FIELD_SEPARATOR, LINE_PREFIX } from "./ytdlp-protocol";

const NOT_AVAILABLE = "NA";
const NO_CODEC = "none";
const POSTPROCESS_STARTED = "started";
const ERROR_PREFIX = "ERROR:";
const MAX_ERROR_LENGTH = 500;
const FULL_PERCENT = 100;

export type OutputEvent =
  | {
      type: "progress";
      stream: "video" | "audio";
      percent: number | null;
      speedBytesPerSec: number | null;
      etaSeconds: number | null;
    }
  | { type: "postprocess"; name: string }
  | { type: "meta"; videoId: string; title: string }
  | { type: "file"; path: string };

export function parseOutputLine(line: string): OutputEvent | null {
  if (line.startsWith(LINE_PREFIX.download)) {
    return parseProgress(line.slice(LINE_PREFIX.download.length));
  }
  if (line.startsWith(LINE_PREFIX.postprocess)) {
    return parsePostprocess(line.slice(LINE_PREFIX.postprocess.length));
  }
  if (line.startsWith(LINE_PREFIX.meta)) {
    return parseMeta(line.slice(LINE_PREFIX.meta.length));
  }
  if (line.startsWith(LINE_PREFIX.file)) {
    return { type: "file", path: line.slice(LINE_PREFIX.file.length) };
  }
  return null;
}

export function extractErrorMessage(stderr: string): string | null {
  const lastError = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith(ERROR_PREFIX))
    .at(-1);
  if (lastError === undefined) return null;
  return lastError.slice(ERROR_PREFIX.length).trim().slice(0, MAX_ERROR_LENGTH);
}

function parseProgress(body: string): OutputEvent | null {
  const [vcodec, downloaded, total, totalEstimate, speed, eta] =
    body.split(FIELD_SEPARATOR);
  if (vcodec === undefined || eta === undefined) return null;
  return {
    type: "progress",
    stream: vcodec === NO_CODEC ? "audio" : "video",
    percent: toPercent(
      toNumber(downloaded),
      toNumber(total) ?? toNumber(totalEstimate),
    ),
    speedBytesPerSec: toNumber(speed),
    etaSeconds: toNumber(eta),
  };
}

function parsePostprocess(body: string): OutputEvent | null {
  const [status, name] = body.split(FIELD_SEPARATOR);
  return status === POSTPROCESS_STARTED && name
    ? { type: "postprocess", name }
    : null;
}

// Başlıkta "|" olabilir; yalnızca ilk ayraç id ile başlığı ayırır
function parseMeta(body: string): OutputEvent | null {
  const separatorIndex = body.indexOf(FIELD_SEPARATOR);
  if (separatorIndex <= 0) return null;
  return {
    type: "meta",
    videoId: body.slice(0, separatorIndex),
    title: body.slice(separatorIndex + 1),
  };
}

function toNumber(value: string | undefined): number | null {
  if (!value || value === NOT_AVAILABLE) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toPercent(
  downloaded: number | null,
  total: number | null,
): number | null {
  if (downloaded === null || total === null || total <= 0) return null;
  return Math.min(FULL_PERCENT, (downloaded / total) * FULL_PERCENT);
}
