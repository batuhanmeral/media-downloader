import "server-only";
import { getEnv } from "@/env";
import { createDownloadManager } from "./services/download-manager";
import { createDownloads, type Downloads } from "./services/downloads";
import { createYtDlpRunner } from "./services/ytdlp";

// Server Action'lar ve route handler farklı modül örnekleri yükleyebilir; tek kopya globalThis'te
const globalForDownloads = globalThis as typeof globalThis & {
  __downloads?: Downloads;
};

export function getDownloads(): Downloads {
  if (!globalForDownloads.__downloads) {
    const runner = createYtDlpRunner();
    const downloadDir = getEnv().DOWNLOAD_DIR;
    const manager = createDownloadManager({ runner, downloadDir });
    globalForDownloads.__downloads = createDownloads({
      runner,
      manager,
      downloadDir,
    });
  }
  return globalForDownloads.__downloads;
}
