import { z } from "zod";
import { mediaUrlSchema } from "../schemas";
import type { PlaylistEntry, PlaylistInfo } from "../types";
import { YtDlpError } from "./ytdlp-error";

const NESTED_PLAYLIST_TYPE = "playlist";
const YOUTUBE_TAB_EXTRACTOR = "YoutubeTab";
const NOT_DOWNLOADABLE_LIVE_STATUSES = new Set(["is_live", "is_upcoming"]);
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);
const CHANNEL_ROOT_PATH = /^\/(@[^/]+|(?:channel|c|user)\/[^/]+)\/?$/;
const VIDEOS_TAB = "videos";
// Ayraçlar, Windows'ta geçersizler, yt-dlp'nin açtığı $VAR/%VAR% ve ASCII dışı boşluk/kontrol karakterleri
const UNSAFE_PATH_CHARS = /[<>:"/\\|?*$%\p{C}]|(?! )\p{Z}/gu;
const EDGE_DOTS_AND_SPACES = /^[. ]+|[. ]+$/g;
const MAX_FOLDER_NAME_BYTES = 200;
const LAST_RESORT_FOLDER_NAME = "playlist";

const rawEntrySchema = z.object({
  _type: z.string().nullish(),
  ie_key: z.string().nullish(),
  id: z.string().min(1),
  url: z.string(),
  title: z.string().nullish(),
  duration: z.number().nullish(),
  live_status: z.string().nullish(),
});

const rawPlaylistSchema = z.object({
  id: z.string(),
  title: z.string().nullish(),
  channel: z.string().nullish(),
  uploader: z.string().nullish(),
  entries: z.array(z.unknown()).default([]),
});

export function toPlaylistInfo(raw: unknown): PlaylistInfo {
  const parsed = rawPlaylistSchema.safeParse(raw);
  if (!parsed.success) {
    throw new YtDlpError("ytdlpFailed", "unexpected yt-dlp output");
  }
  const playlist = parsed.data;
  const entries = playlist.entries
    .map(toEntry)
    .filter((entry): entry is PlaylistEntry => entry !== null);
  return {
    id: playlist.id,
    title: playlist.title ?? playlist.id,
    channel: playlist.channel ?? playlist.uploader ?? null,
    entries,
    excludedCount: playlist.entries.length - entries.length,
  };
}

// İç içe playlist/sekme ve canlı girdiler elenir: kartta görünenden fazlası inmesin
function toEntry(raw: unknown): PlaylistEntry | null {
  const parsed = rawEntrySchema.safeParse(raw);
  if (!parsed.success) return null;
  const entry = parsed.data;
  if (entry._type === NESTED_PLAYLIST_TYPE) return null;
  if (entry.ie_key === YOUTUBE_TAB_EXTRACTOR) return null;
  if (
    entry.live_status &&
    NOT_DOWNLOADABLE_LIVE_STATUSES.has(entry.live_status)
  ) {
    return null;
  }
  const url = mediaUrlSchema.safeParse(entry.url);
  if (!url.success) return null;
  return {
    id: entry.id,
    url: url.data,
    title: entry.title ?? null,
    durationSeconds: entry.duration ?? null,
  };
}

// Çok sekmeli kanalın kökü video yerine sekme listesi döndürür; Videos sekmesine yönlendirilir
export function toChannelVideosUrl(href: string): string {
  const url = new URL(href);
  if (
    !YOUTUBE_HOSTS.has(url.hostname) ||
    !CHANNEL_ROOT_PATH.test(url.pathname)
  ) {
    return href;
  }
  url.pathname = `${url.pathname.replace(/\/$/, "")}/${VIDEOS_TAB}`;
  return url.href;
}

// Ad dışarıdan gelir: ayraç ve noktalar temizlenince DOWNLOAD_DIR dışına çıkamaz
export function toFolderName(title: string, fallback: string): string {
  return (
    sanitizeFolderName(title) ||
    sanitizeFolderName(fallback) ||
    LAST_RESORT_FOLDER_NAME
  );
}

// Kenar noktaları en son silinir: ".." ya da gizli klasör adı kalamaz
function sanitizeFolderName(name: string): string {
  return truncateToBytes(name.replace(UNSAFE_PATH_CHARS, "_")).replace(
    EDGE_DOTS_AND_SPACES,
    "",
  );
}

// Dosya sistemleri adı bayt olarak sınırlar (çoğunda 255); CJK karakter 3 bayttır
function truncateToBytes(name: string): string {
  let result = "";
  for (const char of name) {
    if (Buffer.byteLength(result + char) > MAX_FOLDER_NAME_BYTES) break;
    result += char;
  }
  return result;
}
