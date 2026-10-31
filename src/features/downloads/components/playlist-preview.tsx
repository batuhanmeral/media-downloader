"use client";

import { useI18n } from "@/i18n/i18n-provider";
import { interpolate } from "@/i18n/interpolate";
import { formatDuration } from "@/lib/format";
import {
  PLAYLIST_HEIGHTS,
  type DownloadRequest,
  type PlaylistDownload,
} from "../schemas";
import type { ActionError, PlaylistInfo, VideoOption } from "../types";
import { DownloadOptions } from "./download-options";

// Playlist analizinde boyut bilinmez; seçenekler yalnızca üst sınırdır
const PLAYLIST_VIDEO_OPTIONS: VideoOption[] = PLAYLIST_HEIGHTS.map(
  (height) => ({ height, estimatedBytes: null }),
);

interface PlaylistPreviewProps {
  info: PlaylistInfo;
  url: string;
  onDownload: (input: PlaylistDownload) => Promise<ActionError | null>;
}

export function PlaylistPreview({
  info,
  url,
  onDownload,
}: PlaylistPreviewProps) {
  const { t } = useI18n();
  const meta = [
    interpolate(t.playlist.videoCount, { count: String(info.entries.length) }),
    info.channel,
  ]
    .filter(Boolean)
    .join(" · ");

  function handleDownload(request: DownloadRequest) {
    return onDownload({ request, entryIds: info.entries.map((e) => e.id) });
  }

  return (
    <section
      aria-labelledby="preview-title"
      className="flex flex-col gap-4 rounded-ui border border-line bg-surface p-4"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="preview-title" className="truncate text-sm font-semibold">
          {info.title}
        </h2>
        <p className="font-mono text-xs text-muted">{meta}</p>
        {info.excludedCount > 0 && (
          <p className="text-xs text-muted">
            {interpolate(t.playlist.excluded, {
              count: String(info.excludedCount),
            })}
          </p>
        )}
      </div>
      {/* Uzun listeler sayfayı uzatmasın; klavyeyle kaydırılabilsin diye odaklanabilir */}
      <ol
        aria-label={info.title}
        tabIndex={0}
        className="flex max-h-64 flex-col overflow-y-auto border-y border-line focus-visible:outline-2 focus-visible:outline-accent"
      >
        {info.entries.map((entry, index) => (
          <li
            key={`${entry.id}-${index}`}
            className="flex items-baseline gap-3 border-b border-line py-1.5 last:border-b-0"
          >
            <span className="w-8 shrink-0 text-right font-mono text-xs text-muted">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-ui">
              {entry.title ?? entry.id}
            </span>
            {entry.durationSeconds !== null && (
              <span className="shrink-0 font-mono text-xs text-muted">
                {formatDuration(entry.durationSeconds)}
              </span>
            )}
          </li>
        ))}
      </ol>
      {/* Yeni playlist analiz edilince seçimler sıfırlansın */}
      <DownloadOptions
        key={info.id}
        maxResolution
        videoOptions={PLAYLIST_VIDEO_OPTIONS}
        url={url}
        onDownload={handleDownload}
      />
    </section>
  );
}
