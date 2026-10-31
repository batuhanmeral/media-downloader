import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "@/test/render";
import type { Job } from "../types";
import { DownloadList } from "./download-list";

const URL_ = "https://youtu.be/dQw4w9WgXcQ";

function job(overrides: Partial<Job>): Job {
  return {
    id: "job-1",
    url: URL_,
    title: "Never Gonna Give You Up",
    label: "1080p MP4",
    status: "running",
    phase: "video",
    percent: null,
    speedBytesPerSec: null,
    etaSeconds: null,
    filePath: null,
    error: null,
    playlist: null,
    ...overrides,
  };
}

function renderList(jobs: Job[]) {
  renderWithI18n(<DownloadList jobs={jobs} onCancel={vi.fn(async () => {})} />);
}

describe("DownloadList", () => {
  it("shows an empty state", () => {
    renderList([]);
    expect(screen.getByText("Henüz indirme yok.")).toBeInTheDocument();
  });

  it("shows phase, speed, time left and percent of a running job", () => {
    renderList([
      job({ percent: 62.4, speedBytesPerSec: 4_200_000, etaSeconds: 8 }),
    ]);
    const item = screen.getByRole("listitem", {
      name: "Never Gonna Give You Up",
    });
    expect(item).toHaveTextContent(
      "1080p MP4 · video iniyor · 4,2 MB/s · 0:08 kaldı",
    );
    expect(item).toHaveTextContent("%62");
    expect(
      within(item).getByRole("progressbar", {
        name: "Never Gonna Give You Up",
      }),
    ).toHaveAttribute("aria-valuenow", "62");
    expect(
      within(item).getByRole("button", { name: "İptal et" }),
    ).toBeInTheDocument();
  });

  it("shows an indeterminate bar when the size is unknown", () => {
    renderList([job({ percent: null })]);
    expect(
      screen.getByRole("progressbar", { name: "Never Gonna Give You Up" }),
    ).not.toHaveAttribute("aria-valuenow");
  });

  it("falls back to the link while the title is unknown", () => {
    renderList([job({ title: null })]);
    expect(screen.getByRole("listitem", { name: URL_ })).toBeInTheDocument();
  });

  it("shows where a finished file was saved", () => {
    renderList([
      job({
        status: "done",
        phase: "processing",
        percent: 100,
        filePath: "/v/Song [dQw4w9WgXcQ].mp4",
      }),
    ]);
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("Bitti");
    expect(item).toHaveTextContent("Kaydedildi: /v/Song [dQw4w9WgXcQ].mp4");
    expect(within(item).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the failure reason", () => {
    renderList([
      job({
        status: "error",
        error: { code: "ytdlpFailed", detail: "HTTP Error 403" },
      }),
    ]);
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("Hata");
    expect(item).toHaveTextContent("yt-dlp başarısız oldu: HTTP Error 403");
  });

  it("shows a running playlist's position, current video and overall percent", () => {
    renderList([
      job({
        title: "Road trip",
        percent: 45,
        playlist: {
          total: 4,
          downloaded: 1,
          skipped: ["Gone"],
          current: "Third",
        },
      }),
    ]);
    const item = screen.getByRole("listitem", { name: "Road trip" });
    expect(item).toHaveTextContent("3/4 · Third · 1080p MP4 · video iniyor");
    expect(item).toHaveTextContent("%45");
    expect(
      within(item).getByRole("button", { name: "İptal et" }),
    ).toBeInTheDocument();
  });

  it("summarizes a finished playlist and lists skipped videos", () => {
    renderList([
      job({
        title: "Road trip",
        status: "done",
        percent: 100,
        filePath: "/v/Road trip",
        playlist: {
          total: 3,
          downloaded: 2,
          skipped: ["[Private video]"],
          current: null,
        },
      }),
    ]);
    const item = screen.getByRole("listitem", { name: "Road trip" });
    expect(item).toHaveTextContent(
      "1080p MP4 · 2 indi, 1 atlandı · Kaydedildi: /v/Road trip",
    );
    expect(within(item).getByText("Atlanan videolar (1)")).toBeInTheDocument();
    expect(within(item).getByText("[Private video]")).toBeInTheDocument();
  });
});
