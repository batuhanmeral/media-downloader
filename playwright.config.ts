import { mkdirSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { E2E_DOWNLOAD_DIR } from "./e2e/paths";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

mkdirSync(E2E_DOWNLOAD_DIR, { recursive: true });

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  use: { ...devices["Desktop Chrome"], baseURL: BASE_URL, locale: "en-US" },
  webServer: {
    command: `pnpm build && pnpm exec next start -H 127.0.0.1 -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { DOWNLOAD_DIR: E2E_DOWNLOAD_DIR },
  },
});
