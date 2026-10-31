import "server-only";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  downloadRequestSchema,
  MAX_PLAYLIST_ENTRIES,
  mediaUrlSchema,
  playlistDownloadSchema,
} from "../schemas";
import type {
  ActionError,
  ActionErrorCode,
  ActionResult,
  AnalyzeResult,
  Job,
  PlaylistInfo,
} from "../types";
import type { DownloadManager, JobListener } from "./download-manager";
import { isLiveNow, isPlaylist, toVideoInfo } from "./format-options";
import { toChannelVideosUrl, toFolderName, toPlaylistInfo } from "./playlist";
import type { YtDlpRunner } from "./ytdlp";
import { buildInfoArgs } from "./ytdlp-args";
import { YtDlpError } from "./ytdlp-error";

export interface Downloads {
  analyze(url: unknown): Promise<ActionResult<AnalyzeResult>>;
  start(request: unknown): ActionResult<{ id: string }>;
  startPlaylist(input: unknown): Promise<ActionResult<{ id: string }>>;
  cancel(id: unknown): ActionResult<null>;
  list(): Job[];
  subscribe(listener: JobListener): () => void;
}

interface DownloadsDeps {
  runner: YtDlpRunner;
  manager: DownloadManager;
  downloadDir: string;
}

export function createDownloads({
  runner,
  manager,
  downloadDir,
}: DownloadsDeps): Downloads {
  async function resolvePlaylist(
    url: string,
  ): Promise<ActionResult<PlaylistInfo>> {
    const raw = await runner.runJson(buildInfoArgs(toChannelVideosUrl(url)));
    if (!isPlaylist(raw)) return failure("emptyPlaylist");
    return checkPlaylist(toPlaylistInfo(raw));
  }

  return {
    async analyze(url) {
      const parsedUrl = mediaUrlSchema.safeParse(url);
      if (!parsedUrl.success) return failure("invalidUrl");
      return withYtDlpErrors<AnalyzeResult>(async () => {
        const target = toChannelVideosUrl(parsedUrl.data);
        const raw = await runner.runJson(buildInfoArgs(target));
        if (isPlaylist(raw)) {
          const playlist = checkPlaylist(toPlaylistInfo(raw));
          if (!playlist.ok) return playlist;
          return success({ kind: "playlist", info: playlist.data });
        }
        if (isLiveNow(raw)) return failure("liveNotSupported");
        return success({ kind: "video", info: toVideoInfo(raw) });
      });
    },
    start(request) {
      if (!hasValidUrl(request)) return failure("invalidUrl");
      const parsed = downloadRequestSchema.safeParse(request);
      if (!parsed.success) return failure("invalidRequest");
      return success({ id: manager.start(parsed.data).id });
    },
    async startPlaylist(input) {
      const parsed = playlistDownloadSchema.safeParse(input);
      if (!parsed.success) return failure("invalidRequest");
      const { request, entryIds } = parsed.data;
      return withYtDlpErrors(async () => {
        // Analizden sonra playlist değişmiş olabilir; yalnızca kartta görünenler iner
        const playlist = await resolvePlaylist(request.url);
        if (!playlist.ok) return playlist;
        const wanted = new Set(entryIds);
        const entries = playlist.data.entries.filter((e) => wanted.has(e.id));
        if (entries.length === 0) return failure("emptyPlaylist");
        const folderName = toFolderName(playlist.data.title, playlist.data.id);
        const outputDir = resolve(downloadDir, folderName);
        // Ad dışarıdan gelir; temizlemeye rağmen DOWNLOAD_DIR dışına çıkarsa durulur
        if (dirname(outputDir) !== resolve(downloadDir)) {
          return failure("invalidRequest");
        }
        await mkdir(outputDir, { recursive: true });
        const job = manager.startPlaylist({
          request,
          title: playlist.data.title,
          outputDir,
          entries,
        });
        return success({ id: job.id });
      });
    },
    cancel(id) {
      if (typeof id !== "string" || !manager.cancel(id)) {
        return failure("notFound");
      }
      return success(null);
    },
    list: () => manager.list(),
    subscribe: (listener) => manager.subscribe(listener),
  };
}

// Sınır, elenenler dahil ham girdi sayısına uygulanır: fazlası sessizce kesilmesin
function checkPlaylist(info: PlaylistInfo): ActionResult<PlaylistInfo> {
  if (info.entries.length + info.excludedCount > MAX_PLAYLIST_ENTRIES) {
    return failure("playlistTooLong");
  }
  if (info.entries.length === 0) return failure("emptyPlaylist");
  return success(info);
}

async function withYtDlpErrors<T>(
  run: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof YtDlpError) return failure(error.code, error.detail);
    throw error;
  }
}

function hasValidUrl(request: unknown): boolean {
  return (
    typeof request === "object" &&
    request !== null &&
    "url" in request &&
    mediaUrlSchema.safeParse(request.url).success
  );
}

function success<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

function failure(
  code: ActionErrorCode,
  detail: string | null = null,
): { ok: false; error: ActionError } {
  return { ok: false, error: { code, detail } };
}
