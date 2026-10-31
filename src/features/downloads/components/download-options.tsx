"use client";

import { Download } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n/i18n-provider";
import { formatBytes } from "@/lib/format";
import {
  AUDIO_FORMATS,
  MP3_BITRATES,
  VIDEO_CONTAINERS,
  type AudioFormat,
  type DownloadRequest,
  type Mp3Bitrate,
  type VideoContainer,
} from "../schemas";
import type { ActionError, VideoOption } from "../types";
import { describeError } from "./describe-error";
import { SegmentedControl, type SegmentOption } from "./segmented-control";

const DEFAULT_MAX_HEIGHT = 1080;

type Kind = DownloadRequest["kind"];

interface DownloadOptionsProps {
  videoOptions: VideoOption[];
  url: string;
  onDownload: (request: DownloadRequest) => Promise<ActionError | null>;
  // Playlist'te seçilen çözünürlük kesin değil, üst sınırdır
  maxResolution?: boolean;
}

// Varsayılan: 1080p ve altındaki en yüksek; hepsi üstündeyse en düşüğü
export function pickDefaultHeight(heights: number[]): number {
  return heights.find((h) => h <= DEFAULT_MAX_HEIGHT) ?? heights.at(-1) ?? 0;
}

export function DownloadOptions({
  videoOptions,
  url,
  onDownload,
  maxResolution = false,
}: DownloadOptionsProps) {
  const { t, locale } = useI18n();
  const hasVideo = videoOptions.length > 0;
  const [kind, setKind] = useState<Kind>(hasVideo ? "video" : "audio");
  const [height, setHeight] = useState(() =>
    pickDefaultHeight(videoOptions.map((o) => o.height)),
  );
  const [container, setContainer] = useState<VideoContainer>("mp4");
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3");
  const [bitrate, setBitrate] = useState<Mp3Bitrate>(MP3_BITRATES[0]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);

  const kindOptions: SegmentOption<Kind>[] = [
    ...(hasVideo ? [{ value: "video" as const, label: t.options.video }] : []),
    { value: "audio", label: t.options.audio },
  ];

  function buildRequest(): DownloadRequest {
    if (kind === "video") return { url, kind, height, container };
    if (audioFormat === "mp3") {
      return { url, kind, format: "mp3", bitrateKbps: bitrate };
    }
    return { url, kind, format: "m4a" };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      setError(await onDownload(buildRequest()));
    } catch (cause) {
      console.error("[downloads] start failed", cause);
      setError({ code: "unexpected", detail: null });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <SegmentedControl
          name="kind"
          legend={t.options.kindLegend}
          options={kindOptions}
          value={kind}
          onChange={setKind}
        />
        {kind === "video" ? (
          <>
            <SegmentedControl
              mono
              name="height"
              legend={
                maxResolution
                  ? t.options.maxResolutionLegend
                  : t.options.resolutionLegend
              }
              options={videoOptions.map((option) => ({
                value: option.height,
                label: `${option.height}p`,
                hint:
                  option.estimatedBytes === null
                    ? undefined
                    : `≈${formatBytes(option.estimatedBytes, locale)}`,
              }))}
              value={height}
              onChange={setHeight}
            />
            <SegmentedControl
              mono
              name="container"
              legend={t.options.containerLegend}
              options={VIDEO_CONTAINERS.map((value) => ({
                value,
                label: value.toUpperCase(),
              }))}
              value={container}
              onChange={setContainer}
            />
          </>
        ) : (
          <>
            <SegmentedControl
              mono
              name="audio-format"
              legend={t.options.audioFormatLegend}
              options={AUDIO_FORMATS.map((value) => ({
                value,
                label: value.toUpperCase(),
              }))}
              value={audioFormat}
              onChange={setAudioFormat}
            />
            {audioFormat === "mp3" && (
              <SegmentedControl
                mono
                name="bitrate"
                legend={t.options.bitrateLegend}
                options={MP3_BITRATES.map((value) => ({
                  value,
                  label: `${value} kbps`,
                }))}
                value={bitrate}
                onChange={setBitrate}
              />
            )}
          </>
        )}
        {/* Seçeneklerle aynı satırda en sağda; dar ekranda alta iner */}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto inline-flex items-center gap-2 self-end rounded-ui bg-accent px-4 py-2 text-ui font-semibold text-accent-fg disabled:opacity-60"
        >
          <Download aria-hidden="true" className="size-4" />
          {pending ? t.options.starting : t.options.download}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-ui text-danger">
          {describeError(t, error)}
        </p>
      )}
    </form>
  );
}
