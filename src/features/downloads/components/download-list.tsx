"use client";

import { X } from "lucide-react";
import { useI18n } from "@/i18n/i18n-provider";
import { interpolate } from "@/i18n/interpolate";
import { formatDuration, formatPercent, formatSpeed } from "@/lib/format";
import type { Job, PlaylistProgress } from "../types";
import { describeError } from "./describe-error";

const PERCENT_MAX = 100;

interface DownloadListProps {
  jobs: Job[];
  onCancel: (id: string) => Promise<void>;
}

export function DownloadList({ jobs, onCancel }: DownloadListProps) {
  const { t } = useI18n();
  return (
    <section
      aria-labelledby="downloads-heading"
      className="flex flex-col gap-2"
    >
      <h2
        id="downloads-heading"
        className="font-mono text-xs uppercase tracking-wide text-muted"
      >
        {t.list.heading}
      </h2>
      {jobs.length === 0 ? (
        <p className="text-ui text-muted">{t.list.empty}</p>
      ) : (
        <ul className="flex flex-col">
          {jobs.map((job) => (
            <DownloadItem key={job.id} job={job} onCancel={onCancel} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DownloadItem({
  job,
  onCancel,
}: {
  job: Job;
  onCancel: (id: string) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const title = job.title ?? job.url;
  const running = job.status === "running";

  return (
    <li
      aria-label={title}
      className="flex flex-col gap-1 border-t border-line py-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-ui font-medium">{title}</span>
        <StatusBadge job={job} />
      </div>
      <p className="break-all font-mono text-xs text-muted">{details()}</p>
      {!running && job.playlist && job.playlist.skipped.length > 0 && (
        <SkippedVideos skipped={job.playlist.skipped} />
      )}
      {running && <ProgressBar title={title} percent={job.percent} />}
      {running && (
        <button
          type="button"
          onClick={() => void onCancel(job.id)}
          className="inline-flex items-center gap-1 self-start rounded-ui border border-fg px-2 py-1 text-xs"
        >
          <X aria-hidden="true" className="size-3.5" />
          {t.list.cancel}
        </button>
      )}
    </li>
  );

  function details(): string {
    if (job.status === "error" && job.error) return describeError(t, job.error);
    const summary = job.playlist && playlistSummary(job.playlist);
    if (job.status === "done" && job.filePath) {
      return [job.label, summary, `${t.list.savedTo}: ${job.filePath}`]
        .filter(Boolean)
        .join(" · ");
    }
    if (!running) return [job.label, summary].filter(Boolean).join(" · ");
    return [
      job.playlist && playlistPosition(job.playlist),
      job.playlist?.current,
      job.label,
      t.list.phase[job.phase],
      job.speedBytesPerSec === null
        ? null
        : formatSpeed(job.speedBytesPerSec, locale),
      job.etaSeconds === null
        ? null
        : interpolate(t.list.eta, { time: formatDuration(job.etaSeconds) }),
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function playlistSummary(playlist: PlaylistProgress): string {
    return interpolate(t.list.playlistSummary, {
      downloaded: String(playlist.downloaded),
      skipped: String(playlist.skipped.length),
    });
  }
}

// Şu an inen videonun sırası: bitenler + 1
function playlistPosition(playlist: PlaylistProgress): string {
  const finished = playlist.downloaded + playlist.skipped.length;
  return `${Math.min(finished + 1, playlist.total)}/${playlist.total}`;
}

function SkippedVideos({ skipped }: { skipped: string[] }) {
  const { t } = useI18n();
  return (
    <details className="text-xs text-muted">
      <summary className="cursor-pointer">
        {interpolate(t.list.skippedHeading, { count: String(skipped.length) })}
      </summary>
      <ul className="mt-1 flex flex-col gap-0.5 pl-4">
        {skipped.map((name, index) => (
          <li key={`${name}-${index}`} className="break-all">
            {name}
          </li>
        ))}
      </ul>
    </details>
  );
}

function StatusBadge({ job }: { job: Job }) {
  const { t, locale } = useI18n();
  const className = "shrink-0 font-mono text-xs";
  switch (job.status) {
    case "running":
      return (
        <span className={className}>
          {job.percent === null ? "" : formatPercent(job.percent, locale)}
        </span>
      );
    case "done":
      return (
        <span className={`${className} text-success`}>
          {t.list.status.done}
        </span>
      );
    case "error":
      return (
        <span className={`${className} text-danger`}>
          {t.list.status.error}
        </span>
      );
    case "cancelled":
      return (
        <span className={`${className} text-muted`}>
          {t.list.status.cancelled}
        </span>
      );
  }
}

// Boyut bilinmiyorsa aria-valuenow verilmez; ekran okuyucu belirsiz ilerleme okur
function ProgressBar({
  title,
  percent,
}: {
  title: string;
  percent: number | null;
}) {
  return (
    <div
      role="progressbar"
      aria-label={title}
      aria-valuemin={0}
      aria-valuemax={PERCENT_MAX}
      aria-valuenow={percent === null ? undefined : Math.round(percent)}
      className="mt-1 h-1 overflow-hidden bg-line"
    >
      <div
        className={
          percent === null
            ? "h-full w-1/3 motion-safe:animate-pulse bg-accent"
            : "h-full bg-accent"
        }
        style={percent === null ? undefined : { width: `${percent}%` }}
      />
    </div>
  );
}
