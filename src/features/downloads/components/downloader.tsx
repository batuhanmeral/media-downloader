"use client";

import { useState } from "react";
import { useDownloadEvents } from "../hooks/use-download-events";
import type { DownloadRequest, PlaylistDownload } from "../schemas";
import type { ActionError, ActionResult, AnalyzeResult } from "../types";
import { DownloadList } from "./download-list";
import { PlaylistPreview } from "./playlist-preview";
import { UrlForm } from "./url-form";
import { VideoPreview } from "./video-preview";

export interface DownloaderActions {
  analyzeUrl: (url: string) => Promise<ActionResult<AnalyzeResult>>;
  startDownload: (
    request: DownloadRequest,
  ) => Promise<ActionResult<{ id: string }>>;
  startPlaylistDownload: (
    input: PlaylistDownload,
  ) => Promise<ActionResult<{ id: string }>>;
  cancelDownload: (id: string) => Promise<ActionResult<null>>;
}

interface Analyzed {
  url: string;
  result: AnalyzeResult;
}

export function Downloader({ actions }: { actions: DownloaderActions }) {
  const jobs = useDownloadEvents();
  const [analyzed, setAnalyzed] = useState<Analyzed | null>(null);

  async function handleAnalyze(url: string): Promise<ActionError | null> {
    const result = await actions.analyzeUrl(url);
    if (!result.ok) return result.error;
    setAnalyzed({ url, result: result.data });
    return null;
  }

  async function handleDownload(
    request: DownloadRequest,
  ): Promise<ActionError | null> {
    const result = await actions.startDownload(request);
    return result.ok ? null : result.error;
  }

  async function handlePlaylistDownload(
    input: PlaylistDownload,
  ): Promise<ActionError | null> {
    const result = await actions.startPlaylistDownload(input);
    return result.ok ? null : result.error;
  }

  async function handleCancel(id: string): Promise<void> {
    const result = await actions.cancelDownload(id);
    // notFound: iş bu arada bitti; liste zaten son durumu gösterir
    if (!result.ok && result.error.code !== "notFound") {
      console.error("[downloads] cancel failed", result.error);
    }
  }

  return (
    <main className="flex flex-col gap-8">
      <UrlForm onAnalyze={handleAnalyze} />
      {analyzed?.result.kind === "video" && (
        <VideoPreview
          info={analyzed.result.info}
          url={analyzed.url}
          onDownload={handleDownload}
        />
      )}
      {analyzed?.result.kind === "playlist" && (
        <PlaylistPreview
          info={analyzed.result.info}
          url={analyzed.url}
          onDownload={handlePlaylistDownload}
        />
      )}
      <DownloadList jobs={jobs} onCancel={handleCancel} />
    </main>
  );
}
