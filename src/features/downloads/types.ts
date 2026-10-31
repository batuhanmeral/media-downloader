export interface VideoOption {
  height: number;
  estimatedBytes: number | null;
}

export interface VideoInfo {
  id: string;
  title: string;
  channel: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  videoOptions: VideoOption[];
}

export interface PlaylistEntry {
  id: string;
  url: string;
  title: string | null;
  durationSeconds: number | null;
}

export interface PlaylistInfo {
  id: string;
  title: string;
  channel: string | null;
  entries: PlaylistEntry[];
  excludedCount: number;
}

export type AnalyzeResult =
  { kind: "video"; info: VideoInfo } | { kind: "playlist"; info: PlaylistInfo };

export type JobStatus = "running" | "done" | "error" | "cancelled";
export type JobPhase = "video" | "audio" | "processing";
export type JobErrorCode = "binaryMissing" | "ytdlpFailed";

export interface JobError {
  code: JobErrorCode;
  detail: string | null;
}

export interface PlaylistProgress {
  total: number;
  downloaded: number;
  skipped: string[];
  current: string | null;
}

export interface Job {
  id: string;
  url: string;
  title: string | null;
  label: string;
  status: JobStatus;
  phase: JobPhase;
  percent: number | null;
  speedBytesPerSec: number | null;
  etaSeconds: number | null;
  filePath: string | null;
  error: JobError | null;
  playlist: PlaylistProgress | null;
}

export type ActionErrorCode =
  | JobErrorCode
  | "invalidUrl"
  | "invalidRequest"
  | "notFound"
  | "liveNotSupported"
  | "emptyPlaylist"
  | "playlistTooLong"
  | "unexpected";

export interface ActionError {
  code: ActionErrorCode;
  detail: string | null;
}

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: ActionError };
