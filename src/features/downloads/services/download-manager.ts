import "server-only";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { describeRequest } from "../describe-request";
import type { DownloadRequest } from "../schemas";
import type {
  Job,
  JobError,
  JobPhase,
  PlaylistEntry,
  PlaylistProgress,
} from "../types";
import { parseOutputLine, type OutputEvent } from "./progress-parser";
import type { ProcessExit, RunningProcess, YtDlpRunner } from "./ytdlp";
import { buildDownloadArgs } from "./ytdlp-args";
import { YtDlpError } from "./ytdlp-error";

export const TEMP_DIR_NAME = ".yt-downloader-tmp";
const PROGRESS_EMIT_INTERVAL_MS = 250;
const COMPLETE_PERCENT = 100;
const NO_TRANSFER = {
  percent: null,
  speedBytesPerSec: null,
  etaSeconds: null,
} as const;
const IDLE = { speedBytesPerSec: null, etaSeconds: null } as const;

export type JobListener = (job: Job) => void;

export interface PlaylistJobInput {
  request: DownloadRequest;
  title: string;
  outputDir: string;
  entries: PlaylistEntry[];
}

export interface DownloadManager {
  start(request: DownloadRequest): Job;
  startPlaylist(input: PlaylistJobInput): Job;
  cancel(id: string): boolean;
  list(): Job[];
  subscribe(listener: JobListener): () => void;
}

export interface DownloadManagerDeps {
  runner: YtDlpRunner;
  downloadDir: string;
  createId?: () => string;
  now?: () => number;
}

interface ProcessHandlers {
  onEvent(event: OutputEvent): void;
  onExit(exit: ProcessExit): void;
}

interface PlaylistRun {
  input: PlaylistJobInput;
  cancelRequested: boolean;
  lastError: JobError | null;
}

export function createDownloadManager({
  runner,
  downloadDir,
  createId = randomUUID,
  now = Date.now,
}: DownloadManagerDeps): DownloadManager {
  const jobs = new Map<string, Job>();
  const processes = new Map<string, RunningProcess>();
  const playlistRuns = new Map<string, PlaylistRun>();
  const lastEmitAt = new Map<string, number>();
  const listeners = new Set<JobListener>();

  function emit(job: Job): void {
    lastEmitAt.set(job.id, now());
    for (const listener of listeners) {
      try {
        listener(job);
      } catch (error) {
        console.error(`[downloads] listener failed for job ${job.id}`, error);
      }
    }
  }

  function update(id: string, patch: Partial<Job>): void {
    const current = jobs.get(id);
    if (!current) return;
    const next = { ...current, ...patch };
    jobs.set(id, next);
    // Hızlı indirmelerde saniyede yüzlerce satır gelir; SSE'yi boğmamak için seyreltilir
    const sinceLastEmit = now() - (lastEmitAt.get(id) ?? 0);
    if (
      isProgressOnly(current, next) &&
      sinceLastEmit < PROGRESS_EMIT_INTERVAL_MS
    ) {
      return;
    }
    emit(next);
  }

  function register(
    request: DownloadRequest,
    title: string | null,
    playlist: PlaylistProgress | null,
  ): Job {
    const job: Job = {
      id: createId(),
      url: request.url,
      title,
      label: describeRequest(request),
      status: "running",
      phase: initialPhase(request),
      ...NO_TRANSFER,
      filePath: null,
      error: null,
      playlist,
    };
    jobs.set(job.id, job);
    emit(job);
    return job;
  }

  function runProcess(
    id: string,
    request: DownloadRequest,
    { outputDir, skipLive }: { outputDir: string; skipLive: boolean },
    handlers: ProcessHandlers,
  ): void {
    const tempDir = join(downloadDir, TEMP_DIR_NAME, id);
    try {
      const child = runner.runStreaming(
        buildDownloadArgs(request, { outputDir, tempDir }, { skipLive }),
        {
          onLine: (line) => {
            const event = parseOutputLine(line);
            if (event) handlers.onEvent(event);
          },
          onExit: (exit) => {
            processes.delete(id);
            void removeTempDir(id, tempDir).then(() => handlers.onExit(exit));
          },
        },
      );
      processes.set(id, child);
    } catch (error) {
      // Senkron hata (ör. geçersiz argüman) close olayı üretmez; iş "running"de kalmasın
      console.error(`[downloads] yt-dlp spawn failed for job ${id}`, error);
      const detail = error instanceof Error ? error.message : null;
      handlers.onExit({
        kind: "failed",
        error: new YtDlpError("ytdlpFailed", detail),
      });
    }
  }

  function start(request: DownloadRequest): Job {
    const job = register(request, null, null);
    const { id } = job;
    runProcess(
      id,
      request,
      { outputDir: downloadDir, skipLive: false },
      {
        onEvent: (event) => handleOutput(id, event),
        onExit: (exit) => update(id, exitPatch(exit)),
      },
    );
    return jobs.get(id) ?? job;
  }

  function handleOutput(id: string, event: OutputEvent): void {
    switch (event.type) {
      case "meta":
        return update(id, { title: event.title });
      case "progress":
        return update(id, {
          phase: event.stream,
          percent: event.percent,
          speedBytesPerSec: event.speedBytesPerSec,
          etaSeconds: event.etaSeconds,
        });
      case "postprocess":
        return update(id, { phase: "processing", ...NO_TRANSFER });
      case "file":
        return update(id, { filePath: event.path });
    }
  }

  function startPlaylist(input: PlaylistJobInput): Job {
    const job = register(input.request, input.title, {
      total: input.entries.length,
      downloaded: 0,
      skipped: [],
      current: null,
    });
    playlistRuns.set(job.id, {
      input,
      cancelRequested: false,
      lastError: null,
    });
    runEntry(job.id, 0);
    return jobs.get(job.id) ?? job;
  }

  // Videolar sırayla iner: biri bitince (ya da atlanınca) sıradaki başlar
  function runEntry(id: string, index: number): void {
    const run = playlistRuns.get(id);
    const progress = jobs.get(id)?.playlist;
    if (!run || !progress) return;
    const entry = run.input.entries[index];
    update(id, {
      phase: initialPhase(run.input.request),
      ...IDLE,
      percent: overallPercent(progress, null),
      playlist: { ...progress, current: entry.title ?? entry.id },
    });
    let saved = false;
    runProcess(
      id,
      { ...run.input.request, url: entry.url },
      { outputDir: run.input.outputDir, skipLive: true },
      {
        onEvent: (event) => {
          if (event.type === "file") saved = true;
          handlePlaylistOutput(id, event);
        },
        onExit: (exit) => finishEntry(id, index, exit, saved),
      },
    );
  }

  function handlePlaylistOutput(id: string, event: OutputEvent): void {
    const progress = jobs.get(id)?.playlist;
    if (!progress) return;
    switch (event.type) {
      case "meta":
        return update(id, { playlist: { ...progress, current: event.title } });
      case "progress":
        return update(id, {
          phase: event.stream,
          percent: overallPercent(progress, event.percent),
          speedBytesPerSec: event.speedBytesPerSec,
          etaSeconds: event.etaSeconds,
        });
      case "postprocess":
        return update(id, { phase: "processing", ...IDLE });
      case "file":
        return;
    }
  }

  function finishEntry(
    id: string,
    index: number,
    exit: ProcessExit,
    saved: boolean,
  ): void {
    const run = playlistRuns.get(id);
    const progress = jobs.get(id)?.playlist;
    if (!run || !progress) return;
    if (exit.kind === "failed") {
      run.lastError = { code: exit.error.code, detail: exit.error.detail };
    }
    const counted = countEntry(progress, run.input.entries[index], exit, saved);
    const stopped = exit.kind === "cancelled" || run.cancelRequested;
    const hasNext = index + 1 < run.input.entries.length;
    if (!stopped && hasNext) {
      update(id, { playlist: counted });
      runEntry(id, index + 1);
      return;
    }
    playlistRuns.delete(id);
    update(id, finalPatch(counted, run, stopped));
  }

  function cancel(id: string): boolean {
    const run = playlistRuns.get(id);
    // Playlist iki video arasındaysa çalışan süreç yoktur; sıradaki hiç başlamaz
    if (run) run.cancelRequested = true;
    const child = processes.get(id);
    child?.cancel();
    return run !== undefined || child !== undefined;
  }

  return {
    start,
    startPlaylist,
    cancel,
    list: () => [...jobs.values()].reverse(),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function initialPhase(request: DownloadRequest): JobPhase {
  return request.kind === "video" ? "video" : "audio";
}

// İlerleme yalnızca yüzde/hız değiştirir; playlist nesnesi değişirse hemen yayınlanır
function isProgressOnly(current: Job, next: Job): boolean {
  return (
    current.status === next.status &&
    current.phase === next.phase &&
    current.title === next.title &&
    current.filePath === next.filePath &&
    current.playlist === next.playlist
  );
}

function overallPercent(
  progress: PlaylistProgress,
  entryPercent: number | null,
): number {
  const finished = progress.downloaded + progress.skipped.length;
  const current = (entryPercent ?? 0) / COMPLETE_PERCENT;
  return ((finished + current) / progress.total) * COMPLETE_PERCENT;
}

// Dosya yazılmadan biten (ör. canlı filtresine takılan) video indirilmiş sayılmaz
function countEntry(
  progress: PlaylistProgress,
  entry: PlaylistEntry,
  exit: ProcessExit,
  saved: boolean,
): PlaylistProgress {
  if (exit.kind === "cancelled") return progress;
  if (exit.kind === "success" && saved) {
    return { ...progress, downloaded: progress.downloaded + 1 };
  }
  const name = entry.title ?? progress.current ?? entry.id;
  return { ...progress, skipped: [...progress.skipped, name] };
}

function finalPatch(
  progress: PlaylistProgress,
  run: PlaylistRun,
  cancelled: boolean,
): Partial<Job> {
  const playlist = { ...progress, current: null };
  if (cancelled) return { ...IDLE, status: "cancelled", playlist };
  if (progress.downloaded === 0) {
    return {
      ...IDLE,
      status: "error",
      error: run.lastError ?? { code: "ytdlpFailed", detail: null },
      playlist,
    };
  }
  return {
    ...IDLE,
    status: "done",
    percent: COMPLETE_PERCENT,
    filePath: run.input.outputDir,
    playlist,
  };
}

function exitPatch(exit: ProcessExit): Partial<Job> {
  switch (exit.kind) {
    case "success":
      return { ...IDLE, status: "done", percent: COMPLETE_PERCENT };
    case "cancelled":
      return { ...IDLE, status: "cancelled" };
    case "failed":
      return {
        ...IDLE,
        status: "error",
        error: { code: exit.error.code, detail: exit.error.detail },
      };
  }
}

async function removeTempDir(id: string, tempDir: string): Promise<void> {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`[downloads] temp cleanup failed for job ${id}`, error);
  }
}
