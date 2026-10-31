import type { DownloadRequest } from "./schemas";

// Etiket dilden bağımsız: yalnızca format adı ve sayılar
export function describeRequest(request: DownloadRequest): string {
  if (request.kind === "video") {
    return `${request.height}p ${request.container.toUpperCase()}`;
  }
  if (request.format === "mp3") return `MP3 ${request.bitrateKbps}k`;
  return "M4A";
}
