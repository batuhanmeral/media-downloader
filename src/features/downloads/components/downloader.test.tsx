import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeEventSource } from "@/test/fake-event-source";
import { renderWithI18n } from "@/test/render";
import { describeRequest } from "../describe-request";
import type { DownloadRequest, PlaylistDownload } from "../schemas";
import type { Job, PlaylistInfo, VideoInfo } from "../types";
import { Downloader, type DownloaderActions } from "./downloader";

const VIDEO_URL = "https://youtu.be/dQw4w9WgXcQ";
const MISSING_URL = "https://youtu.be/aaaaaaaaaaa";
const INFO: VideoInfo = {
  id: "dQw4w9WgXcQ",
  title: "Never Gonna Give You Up",
  channel: "Rick Astley",
  durationSeconds: 213,
  thumbnailUrl: null,
  videoOptions: [
    { height: 2160, estimatedBytes: 948132545 },
    { height: 1080, estimatedBytes: 171155466 },
  ],
};

const PLAYLIST_URL = "https://www.youtube.com/playlist?list=PL1";
const PLAYLIST: PlaylistInfo = {
  id: "PL1",
  title: "Road trip",
  channel: "Mixer",
  entries: [
    {
      id: "a1",
      url: "https://youtu.be/a1",
      title: "First",
      durationSeconds: 61,
    },
    {
      id: "b2",
      url: "https://youtu.be/b2",
      title: "Second",
      durationSeconds: null,
    },
  ],
  excludedCount: 1,
};

function makeJob(overrides: Partial<Job>): Job {
  return {
    id: "job-1",
    url: VIDEO_URL,
    title: INFO.title,
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

// Sunucuyu taklit eder: iş başlayınca veya iptal edilince SSE üzerinden yayınlar
function createActions(): DownloaderActions {
  return {
    analyzeUrl: vi.fn(async (url: string) =>
      url === VIDEO_URL
        ? { ok: true as const, data: { kind: "video" as const, info: INFO } }
        : url === PLAYLIST_URL
          ? {
              ok: true as const,
              data: { kind: "playlist" as const, info: PLAYLIST },
            }
          : {
              ok: false as const,
              error: {
                code: "ytdlpFailed" as const,
                detail: "[youtube] aaaaaaaaaaa: Video unavailable",
              },
            },
    ),
    startDownload: vi.fn(async (request: DownloadRequest) => {
      FakeEventSource.latest().emit(
        "job",
        makeJob({ label: describeRequest(request) }),
      );
      return { ok: true as const, data: { id: "job-1" } };
    }),
    startPlaylistDownload: vi.fn(async (input: PlaylistDownload) => {
      FakeEventSource.latest().emit(
        "job",
        makeJob({
          title: PLAYLIST.title,
          label: describeRequest(input.request),
          playlist: { total: 2, downloaded: 0, skipped: [], current: "First" },
        }),
      );
      return { ok: true as const, data: { id: "job-1" } };
    }),
    cancelDownload: vi.fn(async (id: string) => {
      FakeEventSource.latest().emit(
        "job",
        makeJob({ id, status: "cancelled" }),
      );
      return { ok: true as const, data: null };
    }),
  };
}

function renderDownloader(locale: "tr" | "en" = "tr") {
  const actions = createActions();
  renderWithI18n(<Downloader actions={actions} />, locale);
  act(() => FakeEventSource.latest().emit("snapshot", []));
  return actions;
}

async function analyze(url: string) {
  await userEvent.type(screen.getByLabelText("Video linki"), url);
  await userEvent.click(screen.getByRole("button", { name: "Analiz et" }));
}

describe("Downloader", () => {
  beforeEach(() => {
    FakeEventSource.reset();
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  it("listens to the downloads event stream", () => {
    renderDownloader();
    expect(FakeEventSource.latest().url).toBe("/api/downloads/events");
  });

  it("analyzes a link and lists a default 1080p MP4 download", async () => {
    renderDownloader();
    await analyze(VIDEO_URL);
    expect(
      await screen.findByRole("heading", { name: INFO.title }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "İndir" }));
    const item = await screen.findByRole("listitem", { name: INFO.title });
    expect(item).toHaveTextContent("1080p MP4");
  });

  it("shows a playlist and downloads every listed video", async () => {
    const actions = renderDownloader();
    await analyze(PLAYLIST_URL);
    expect(
      await screen.findByRole("heading", { name: PLAYLIST.title }),
    ).toBeInTheDocument();
    const list = screen.getByRole("list", { name: PLAYLIST.title });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(list).toHaveTextContent("First1:01");
    expect(screen.getByText("2 video · Mixer")).toBeInTheDocument();
    expect(
      screen.getByText("1 video kullanılamıyor, listeye alınmadı."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "En yüksek çözünürlük" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "1080p" })).toBeChecked();

    await userEvent.click(screen.getByRole("button", { name: "İndir" }));

    expect(actions.startPlaylistDownload).toHaveBeenCalledWith({
      request: {
        url: PLAYLIST_URL,
        kind: "video",
        height: 1080,
        container: "mp4",
      },
      entryIds: ["a1", "b2"],
    });
    expect(
      await screen.findByRole("listitem", { name: PLAYLIST.title }),
    ).toHaveTextContent("1/2 · First · 1080p MP4");
  });

  it("downloads audio as MP3 320 kbps", async () => {
    renderDownloader();
    await analyze(VIDEO_URL);
    await userEvent.click(await screen.findByRole("radio", { name: "Ses" }));
    await userEvent.click(screen.getByRole("button", { name: "İndir" }));
    expect(
      await screen.findByRole("listitem", { name: INFO.title }),
    ).toHaveTextContent("MP3 320k");
  });

  it("cancels a running download", async () => {
    renderDownloader();
    act(() => FakeEventSource.latest().emit("job", makeJob({})));
    const item = screen.getByRole("listitem", { name: INFO.title });
    await userEvent.click(
      within(item).getByRole("button", { name: "İptal et" }),
    );
    expect(await screen.findByText("İptal edildi")).toBeInTheDocument();
  });

  it("shows yt-dlp errors under the link input", async () => {
    renderDownloader();
    await analyze(MISSING_URL);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "yt-dlp başarısız oldu: [youtube] aaaaaaaaaaa: Video unavailable",
    );
  });

  it("replaces the list with a new snapshot after reconnecting", () => {
    renderDownloader();
    act(() => FakeEventSource.latest().emit("job", makeJob({})));
    expect(
      screen.getByRole("listitem", { name: INFO.title }),
    ).toBeInTheDocument();
    act(() => FakeEventSource.latest().emit("snapshot", []));
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByText("Henüz indirme yok.")).toBeInTheDocument();
  });

  it("renders in English for the en locale", () => {
    renderDownloader("en");
    expect(screen.getByRole("button", { name: "Analyze" })).toBeInTheDocument();
    expect(screen.getByText("No downloads yet.")).toBeInTheDocument();
  });
});
