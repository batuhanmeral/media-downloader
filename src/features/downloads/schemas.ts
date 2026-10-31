import { z } from "zod";

const MAX_URL_LENGTH = 2048;
const MAX_VIDEO_HEIGHT = 4320;
const MAX_ENTRY_ID_LENGTH = 256;
const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

export const VIDEO_CONTAINERS = ["mp4", "mkv"] as const;
export const AUDIO_FORMATS = ["mp3", "m4a"] as const;
export const MAX_PLAYLIST_ENTRIES = 300;
// Playlist'te her videonun formatları çözülmez; çözünürlük üst sınır olarak seçilir
export const PLAYLIST_HEIGHTS = [2160, 1440, 1080, 720, 480, 360] as const;

export const mediaUrlSchema = z
  .string()
  .trim()
  .max(MAX_URL_LENGTH)
  .transform((value, ctx) => {
    const url = parseUrl(value);
    if (!url || !ALLOWED_PROTOCOLS.has(url.protocol)) {
      ctx.issues.push({ code: "custom", message: "invalidUrl", input: value });
      return z.NEVER;
    }
    // Ham link yerine normalize hâli: WHATWG ve yt-dlp ters eğik çizgiyi farklı ayrıştırır
    return url.href;
  });

const videoRequestSchema = z.object({
  url: mediaUrlSchema,
  kind: z.literal("video"),
  height: z.number().int().positive().max(MAX_VIDEO_HEIGHT),
  container: z.enum(VIDEO_CONTAINERS),
});

const mp3RequestSchema = z.object({
  url: mediaUrlSchema,
  kind: z.literal("audio"),
  format: z.literal("mp3"),
  bitrateKbps: z.literal([320, 192, 128]),
});

const m4aRequestSchema = z.object({
  url: mediaUrlSchema,
  kind: z.literal("audio"),
  format: z.literal("m4a"),
});

export const downloadRequestSchema = z.union([
  videoRequestSchema,
  mp3RequestSchema,
  m4aRequestSchema,
]);

// Kartta gösterilen videolar dışında hiçbir şey inmesin diye ID'ler istekle gelir
export const playlistDownloadSchema = z.object({
  request: downloadRequestSchema,
  entryIds: z
    .array(z.string().min(1).max(MAX_ENTRY_ID_LENGTH))
    .min(1)
    .max(MAX_PLAYLIST_ENTRIES),
});

export type DownloadRequest = z.infer<typeof downloadRequestSchema>;
export type PlaylistDownload = z.infer<typeof playlistDownloadSchema>;
export type VideoContainer = (typeof VIDEO_CONTAINERS)[number];
export type AudioFormat = (typeof AUDIO_FORMATS)[number];
export type Mp3Bitrate = z.infer<typeof mp3RequestSchema>["bitrateKbps"];

export const MP3_BITRATES: readonly Mp3Bitrate[] = [320, 192, 128];

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
