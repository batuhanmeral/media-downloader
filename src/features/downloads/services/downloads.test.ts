// @vitest-environment node
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import info4k from "./__fixtures__/info-4k.json";
import { createDownloadManager } from "./download-manager";
import { createDownloads } from "./downloads";
import type { YtDlpRunner } from "./ytdlp";
import { YtDlpError } from "./ytdlp-error";

const VIDEO_URL = "https://www.youtube.com/watch?v=LXb3EKWsInQ";
const PLAYLIST_URL = "https://www.youtube.com/playlist?list=PL1";

function rawEntry(id: string) {
  return {
    _type: "url",
    ie_key: "Youtube",
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: `Video ${id}`,
    duration: 60,
  };
}

function entry(id: string) {
  return {
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: `Video ${id}`,
    durationSeconds: 60,
  };
}

const PLAYLIST = {
  _type: "playlist",
  id: "PL1",
  title: "Road trip",
  channel: "Mixer",
  entries: [rawEntry("a1"), rawEntry("b2")],
};

function setup(runJson: YtDlpRunner["runJson"] = async () => info4k) {
  const runner: YtDlpRunner = {
    runJson: vi.fn(runJson),
    runStreaming: () => ({ cancel: () => {} }),
  };
  const downloadDir = mkdtempSync(join(tmpdir(), "ytdl-facade-"));
  const manager = createDownloadManager({
    runner,
    downloadDir,
    createId: () => "job-1",
  });
  return {
    downloads: createDownloads({ runner, manager, downloadDir }),
    runner,
    downloadDir,
  };
}

describe("createDownloads", () => {
  it("never runs yt-dlp for a non-http url", async () => {
    const { downloads, runner } = setup();
    await expect(downloads.analyze("file:///etc/passwd")).resolves.toEqual({
      ok: false,
      error: { code: "invalidUrl", detail: null },
    });
    expect(runner.runJson).not.toHaveBeenCalled();
  });

  it("returns the video's resolutions", async () => {
    const { downloads } = setup();
    const result = await downloads.analyze(VIDEO_URL);
    expect(
      result.ok &&
        result.data.kind === "video" &&
        result.data.info.videoOptions.map((o) => o.height),
    ).toEqual([2160, 1440, 1080, 360, 144]);
  });

  it("hands the trimmed url to yt-dlp and the job", async () => {
    const { downloads, runner } = setup();
    await downloads.analyze(`  ${VIDEO_URL}  `);
    expect(vi.mocked(runner.runJson).mock.calls[0][0].at(-1)).toBe(VIDEO_URL);
    downloads.start({ url: `  ${VIDEO_URL}  `, kind: "audio", format: "m4a" });
    expect(downloads.list()[0].url).toBe(VIDEO_URL);
  });

  it("returns a playlist with its downloadable videos", async () => {
    const { downloads } = setup(async () => PLAYLIST);
    await expect(downloads.analyze(PLAYLIST_URL)).resolves.toEqual({
      ok: true,
      data: {
        kind: "playlist",
        info: {
          id: "PL1",
          title: "Road trip",
          channel: "Mixer",
          entries: [entry("a1"), entry("b2")],
          excludedCount: 0,
        },
      },
    });
  });

  it("analyzes a channel's Videos tab", async () => {
    const { downloads, runner } = setup(async () => PLAYLIST);
    await downloads.analyze("https://www.youtube.com/@mixer");
    expect(vi.mocked(runner.runJson).mock.calls[0][0].at(-1)).toBe(
      "https://www.youtube.com/@mixer/videos",
    );
  });

  it("rejects empty and over-long playlists", async () => {
    const empty = setup(async () => ({ ...PLAYLIST, entries: [] }));
    await expect(empty.downloads.analyze(PLAYLIST_URL)).resolves.toMatchObject({
      ok: false,
      error: { code: "emptyPlaylist" },
    });
    const ids = Array.from({ length: 301 }, (_, i) => `v${i}`);
    const long = setup(async () => ({
      ...PLAYLIST,
      entries: ids.map(rawEntry),
    }));
    await expect(long.downloads.analyze(PLAYLIST_URL)).resolves.toMatchObject({
      ok: false,
      error: { code: "playlistTooLong" },
    });
  });

  it("downloads only the shown videos into a folder named after the playlist", async () => {
    const { downloads, downloadDir } = setup(async () => ({
      ...PLAYLIST,
      // Analizden sonra eklenen c3 kartta yoktu; inmemeli
      entries: [...PLAYLIST.entries, rawEntry("c3")],
    }));
    const result = await downloads.startPlaylist({
      request: { url: PLAYLIST_URL, kind: "audio", format: "m4a" },
      entryIds: ["a1", "b2"],
    });
    expect(result).toEqual({ ok: true, data: { id: "job-1" } });
    const outputDir = join(downloadDir, "Road trip");
    expect(statSync(outputDir).isDirectory()).toBe(true);
    expect(downloads.list()[0]).toMatchObject({
      title: "Road trip",
      label: "M4A",
      playlist: { total: 2, current: "Video a1" },
    });
  });

  it("refuses to start a playlist when none of the shown videos remain", async () => {
    const { downloads } = setup(async () => PLAYLIST);
    await expect(
      downloads.startPlaylist({
        request: { url: PLAYLIST_URL, kind: "audio", format: "m4a" },
        entryIds: ["gone"],
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "emptyPlaylist" } });
    await expect(
      downloads.startPlaylist({ request: { url: PLAYLIST_URL }, entryIds: [] }),
    ).resolves.toMatchObject({ ok: false, error: { code: "invalidRequest" } });
  });

  it("rejects a stream that is live now", async () => {
    const { downloads } = setup(async () => ({
      ...info4k,
      is_live: true,
      live_status: "is_live",
    }));
    await expect(downloads.analyze(VIDEO_URL)).resolves.toEqual({
      ok: false,
      error: { code: "liveNotSupported", detail: null },
    });
  });

  it("accepts a past live stream", async () => {
    const { downloads } = setup(async () => ({
      ...info4k,
      is_live: false,
      live_status: "was_live",
    }));
    const result = await downloads.analyze(VIDEO_URL);
    expect(result.ok).toBe(true);
  });

  it("passes yt-dlp errors through as action errors", async () => {
    const { downloads } = setup(async () => {
      throw new YtDlpError("ytdlpFailed", "[youtube] x: Video unavailable");
    });
    await expect(downloads.analyze(VIDEO_URL)).resolves.toEqual({
      ok: false,
      error: { code: "ytdlpFailed", detail: "[youtube] x: Video unavailable" },
    });
  });

  it("rethrows unexpected errors", async () => {
    const { downloads } = setup(async () => {
      throw new TypeError("bug");
    });
    await expect(downloads.analyze(VIDEO_URL)).rejects.toThrow("bug");
  });

  it("validates download requests", () => {
    const { downloads } = setup();
    expect(
      downloads.start({
        url: "javascript:alert(1)",
        kind: "audio",
        format: "m4a",
      }),
    ).toEqual({
      ok: false,
      error: { code: "invalidUrl", detail: null },
    });
    expect(
      downloads.start({ url: VIDEO_URL, kind: "audio", format: "flac" }),
    ).toEqual({
      ok: false,
      error: { code: "invalidRequest", detail: null },
    });
    expect(downloads.start(null)).toMatchObject({
      ok: false,
      error: { code: "invalidUrl" },
    });
  });

  it("starts a valid download and lists it", () => {
    const { downloads } = setup();
    expect(
      downloads.start({ url: VIDEO_URL, kind: "audio", format: "m4a" }),
    ).toEqual({
      ok: true,
      data: { id: "job-1" },
    });
    expect(downloads.list()).toMatchObject([{ id: "job-1", label: "M4A" }]);
  });

  it("cancels running jobs and reports unknown ones", () => {
    const { downloads } = setup();
    downloads.start({ url: VIDEO_URL, kind: "audio", format: "m4a" });
    expect(downloads.cancel("job-1")).toEqual({ ok: true, data: null });
    expect(downloads.cancel("missing")).toEqual({
      ok: false,
      error: { code: "notFound", detail: null },
    });
    expect(downloads.cancel(42)).toMatchObject({ ok: false });
  });
});
