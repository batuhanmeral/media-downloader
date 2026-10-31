import { z } from "zod";
import type { VideoInfo, VideoOption } from "../types";
import { YtDlpError } from "./ytdlp-error";

const NO_CODEC = "none";
const PLAYLIST_TYPE = "playlist";

const rawFormatSchema = z.object({
  vcodec: z.string().nullish(),
  acodec: z.string().nullish(),
  height: z.number().nullish(),
  filesize: z.number().nullish(),
  filesize_approx: z.number().nullish(),
});

const LIVE_NOW_STATUS = "is_live";

const rawTypeSchema = z.object({ _type: z.string().nullish() });

const rawLiveSchema = z.object({
  is_live: z.boolean().nullish(),
  live_status: z.string().nullish(),
});

const rawInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  channel: z.string().nullish(),
  uploader: z.string().nullish(),
  duration: z.number().nullish(),
  thumbnail: z.string().nullish(),
  formats: z.array(rawFormatSchema).default([]),
});

type RawFormat = z.infer<typeof rawFormatSchema>;
type VideoFormat = RawFormat & { height: number };

export function toVideoInfo(raw: unknown): VideoInfo {
  const parsed = rawInfoSchema.safeParse(raw);
  if (!parsed.success) {
    throw new YtDlpError("ytdlpFailed", "unexpected yt-dlp output");
  }
  const info = parsed.data;
  return {
    id: info.id,
    title: info.title,
    channel: info.channel ?? info.uploader ?? null,
    durationSeconds: info.duration ?? null,
    thumbnailUrl: toThumbnailUrl(info.thumbnail),
    videoOptions: toVideoOptions(info.formats),
  };
}

function toThumbnailUrl(thumbnail: string | null | undefined): string | null {
  if (!thumbnail || !URL.canParse(thumbnail)) return null;
  const url = new URL(thumbnail);
  // next/image yalnızca https host'lara izin verir; http dev'de render'ı çökertir
  return url.protocol === "https:" ? thumbnail : null;
}

export function isPlaylist(raw: unknown): boolean {
  const parsed = rawTypeSchema.safeParse(raw);
  return parsed.success && parsed.data._type === PLAYLIST_TYPE;
}

// Canlı kayıtta ffmpeg süreci iptalle durdurulamıyor; bu yüzden analizde reddedilir
export function isLiveNow(raw: unknown): boolean {
  const parsed = rawLiveSchema.safeParse(raw);
  if (!parsed.success) return false;
  const { is_live, live_status } = parsed.data;
  return is_live === true || live_status === LIVE_NOW_STATUS;
}

function toVideoOptions(formats: RawFormat[]): VideoOption[] {
  const audioBytes = largestSize(formats.filter(isAudioOnly));
  const videoFormats = formats.filter(hasVideo);
  const heights = [...new Set(videoFormats.map((f) => f.height))].sort(
    (a, b) => b - a,
  );
  return heights.map((height) => {
    const videoBytes = largestSize(
      videoFormats.filter((f) => f.height === height),
    );
    return {
      height,
      // Tahmin kasıtlı olarak üst sınır: o yükseklikteki en büyük video + en büyük ses
      estimatedBytes:
        videoBytes === null ? null : videoBytes + (audioBytes ?? 0),
    };
  });
}

// Bazı sitelerde vcodec bilinmez (null); yalnızca açık "none" ses demektir
function hasVideo(format: RawFormat): format is VideoFormat {
  return (
    format.vcodec !== NO_CODEC &&
    typeof format.height === "number" &&
    format.height > 0
  );
}

function isAudioOnly(format: RawFormat): boolean {
  return isCodec(format.acodec) && !isCodec(format.vcodec);
}

function isCodec(codec: string | null | undefined): boolean {
  return codec != null && codec !== NO_CODEC;
}

function largestSize(formats: RawFormat[]): number | null {
  const sizes = formats
    .map((f) => f.filesize ?? f.filesize_approx)
    .filter((size): size is number => typeof size === "number");
  return sizes.length === 0 ? null : Math.max(...sizes);
}
