"use server";

import type { DownloadRequest, PlaylistDownload } from "./schemas";
import { getDownloads } from "./server";
import type { ActionResult, AnalyzeResult } from "./types";

// Girdi tipleri istemciye yol gösterir; doğrulama facade'da unknown üzerinden yapılır
export async function analyzeUrl(
  url: string,
): Promise<ActionResult<AnalyzeResult>> {
  return getDownloads().analyze(url);
}

export async function startDownload(
  request: DownloadRequest,
): Promise<ActionResult<{ id: string }>> {
  return getDownloads().start(request);
}

export async function startPlaylistDownload(
  input: PlaylistDownload,
): Promise<ActionResult<{ id: string }>> {
  return getDownloads().startPlaylist(input);
}

export async function cancelDownload(id: string): Promise<ActionResult<null>> {
  return getDownloads().cancel(id);
}
