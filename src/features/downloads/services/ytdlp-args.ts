import { MAX_PLAYLIST_ENTRIES, type DownloadRequest } from "../schemas";
import {
  DOWNLOAD_PROGRESS_TEMPLATE,
  FILE_PRINT_TEMPLATE,
  META_PRINT_TEMPLATE,
  POSTPROCESS_PROGRESS_TEMPLATE,
} from "./ytdlp-protocol";

const IGNORE_CONFIG_FLAG = "--ignore-config";
const BASE_NAME_TEMPLATE = "%(title)s [%(id)s]";

export interface DownloadPaths {
  outputDir: string;
  tempDir: string;
}

export interface DownloadOptions {
  skipLive?: boolean;
}

export function buildInfoArgs(url: string): string[] {
  // İndirme klasörü/cwd'ye konmuş yt-dlp.conf yüklenip komut çalıştırmasın
  return [
    IGNORE_CONFIG_FLAG,
    "-J",
    "--no-playlist",
    // Playlist linkinde girdiler tek tek çözülmesin; analiz hızlıca reddedebilsin
    "--flat-playlist",
    // Sınırı aşan dev kanallar baştan sona listelenmesin; fazlası olduğu anlaşılsın yeter
    "--playlist-end",
    String(MAX_PLAYLIST_ENTRIES + 1),
    "--",
    url,
  ];
}

export function buildDownloadArgs(
  request: DownloadRequest,
  paths: DownloadPaths,
  { skipLive = false }: DownloadOptions = {},
): string[] {
  return [
    ...commonArgs(paths),
    "-o",
    outputTemplate(request),
    ...formatArgs(request),
    // Analizden sonra canlıya geçen girdi atlanır; canlı kayıt iptalle durmaz
    ...(skipLive ? ["--match-filter", "!is_live"] : []),
    "--",
    request.url,
  ];
}

function commonArgs({ outputDir, tempDir }: DownloadPaths): string[] {
  return [
    // İndirme klasörü/cwd'ye konmuş yt-dlp.conf yüklenip komut çalıştırmasın
    IGNORE_CONFIG_FLAG,
    // --print tek başına --simulate'i açar; gerçek indirme için kapatılır
    "--no-simulate",
    "--no-playlist",
    "--newline",
    "--quiet",
    "--progress",
    "--embed-metadata",
    "--embed-thumbnail",
    "-P",
    outputDir,
    "-P",
    `temp:${tempDir}`,
    "--progress-template",
    DOWNLOAD_PROGRESS_TEMPLATE,
    "--progress-template",
    POSTPROCESS_PROGRESS_TEMPLATE,
    "--print",
    META_PRINT_TEMPLATE,
    "--print",
    FILE_PRINT_TEMPLATE,
  ];
}

// Kalite adda olmazsa yt-dlp başka kalitedeki mevcut dosyayı bulup indirmeyi atlar
function outputTemplate(request: DownloadRequest): string {
  if (request.kind === "video") {
    return `${BASE_NAME_TEMPLATE} %(height)sp.%(ext)s`;
  }
  if (request.format === "mp3") {
    return `${BASE_NAME_TEMPLATE} ${request.bitrateKbps}k.%(ext)s`;
  }
  return `${BASE_NAME_TEMPLATE}.%(ext)s`;
}

function formatArgs(request: DownloadRequest): string[] {
  if (request.kind === "video") {
    // "res" en kısa kenarı ölçer; dikey videolarda arayüzdeki yükseklikle eşleşmez
    const sort =
      request.container === "mp4"
        ? `height:${request.height},vcodec:h264,acodec:aac`
        : `height:${request.height}`;
    return [
      "-f",
      "bv*+ba/b",
      "-S",
      sort,
      "--merge-output-format",
      request.container,
    ];
  }
  if (request.format === "mp3") {
    // Ayrı ses akışı olmayan sitelerde ses birleşik akıştan çıkarılır
    return [
      "-f",
      "ba/b",
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      `${request.bitrateKbps}K`,
    ];
  }
  return ["-f", "ba[ext=m4a]/ba/b", "-x", "--audio-format", "m4a"];
}
