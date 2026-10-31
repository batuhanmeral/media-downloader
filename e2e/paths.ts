import { tmpdir } from "node:os";
import { join } from "node:path";

export const E2E_DOWNLOAD_DIR = join(tmpdir(), "yt-downloader-e2e");
