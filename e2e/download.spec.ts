import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { E2E_DOWNLOAD_DIR } from "./paths";

// Gerçek YouTube'a gider: 19 saniyelik "Me at the zoo"
const VIDEO_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw";
const VIDEO_ID = "jNQXAC9IVRw";
const TITLE = "Me at the zoo";

test.beforeAll(() => {
  rmSync(E2E_DOWNLOAD_DIR, { recursive: true, force: true });
  mkdirSync(E2E_DOWNLOAD_DIR, { recursive: true });
});

test("analyzes a video and downloads it as MP4", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Video link").fill(VIDEO_URL);
  await page.getByRole("button", { name: "Analyze" }).click();
  await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();

  await page.getByRole("button", { name: "Download" }).click();
  const item = page.getByRole("listitem", { name: TITLE });
  await expect(item.getByText("Done")).toBeVisible({ timeout: 90_000 });

  const files = readdirSync(E2E_DOWNLOAD_DIR);
  expect(files).toContain(`${TITLE} [${VIDEO_ID}] 240p.mp4`);
});
