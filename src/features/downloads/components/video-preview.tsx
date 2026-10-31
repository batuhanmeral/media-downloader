"use client";

import Image from "next/image";
import { formatDuration } from "@/lib/format";
import type { DownloadRequest } from "../schemas";
import type { ActionError, VideoInfo } from "../types";
import { DownloadOptions } from "./download-options";

const THUMBNAIL_WIDTH = 112;
const THUMBNAIL_HEIGHT = 63;

interface VideoPreviewProps {
  info: VideoInfo;
  url: string;
  onDownload: (request: DownloadRequest) => Promise<ActionError | null>;
}

export function VideoPreview({ info, url, onDownload }: VideoPreviewProps) {
  const meta = [
    info.durationSeconds === null ? null : formatDuration(info.durationSeconds),
    info.channel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      aria-labelledby="preview-title"
      className="flex flex-col gap-4 rounded-ui border border-line bg-surface p-4"
    >
      <div className="flex gap-3">
        {info.thumbnailUrl && (
          <Image
            src={info.thumbnailUrl}
            alt=""
            width={THUMBNAIL_WIDTH}
            height={THUMBNAIL_HEIGHT}
            className="shrink-0 rounded-ui bg-line object-cover"
          />
        )}
        <div className="flex min-w-0 flex-col justify-center gap-1">
          <h2 id="preview-title" className="truncate text-sm font-semibold">
            {info.title}
          </h2>
          {meta && <p className="font-mono text-xs text-muted">{meta}</p>}
        </div>
      </div>
      {/* Yeni video analiz edilince seçimler sıfırlansın */}
      <DownloadOptions
        key={info.id}
        videoOptions={info.videoOptions}
        url={url}
        onDownload={onDownload}
      />
    </section>
  );
}
