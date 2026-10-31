// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { DownloadRequest } from "../schemas";
import type { Job, PlaylistEntry } from "../types";
import { createDownloadManager, TEMP_DIR_NAME } from "./download-manager";
import type {
  ProcessExit,
  RunningProcess,
  StreamHandlers,
  YtDlpRunner,
} from "./ytdlp";
import { YtDlpError } from "./ytdlp-error";

const VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const VIDEO_REQUEST: DownloadRequest = {
  url: VIDEO_URL,
  kind: "video",
  height: 1080,
  container: "mp4",
};
const MP3_REQUEST: DownloadRequest = {
  url: VIDEO_URL,
  kind: "audio",
  format: "mp3",
  bitrateKbps: 320,
};

class FakeProcess implements RunningProcess {
  cancelled = false;
  constructor(
    readonly args: string[],
    private readonly handlers: StreamHandlers,
  ) {}
  cancel(): void {
    this.cancelled = true;
  }
  emit(...lines: string[]): void {
    for (const line of lines) this.handlers.onLine(line);
  }
  exit(exit: ProcessExit): void {
    this.handlers.onExit(exit);
  }
}

function setup() {
  const processes: FakeProcess[] = [];
  const runner: YtDlpRunner = {
    runJson: async () => {
      throw new Error("not used");
    },
    runStreaming: (args, handlers) => {
      const process = new FakeProcess(args, handlers);
      processes.push(process);
      return process;
    },
  };
  const clock = { time: 1000 };
  let sequence = 0;
  const downloadDir = mkdtempSync(join(tmpdir(), "ytdl-manager-"));
  const manager = createDownloadManager({
    runner,
    downloadDir,
    createId: () => `job-${++sequence}`,
    now: () => clock.time,
  });
  const events: Job[] = [];
  manager.subscribe((job) => events.push(job));
  const lastProcess = (): FakeProcess => {
    const process = processes.at(-1);
    if (!process) throw new Error("no process started");
    return process;
  };
  const tempDirOf = (id: string) => join(downloadDir, TEMP_DIR_NAME, id);
  return {
    manager,
    events,
    clock,
    downloadDir,
    processes,
    lastProcess,
    tempDirOf,
  };
}

describe("createDownloadManager", () => {
  it("starts a running job and announces it", () => {
    const { manager, events, lastProcess, tempDirOf } = setup();
    const job = manager.start(VIDEO_REQUEST);
    expect(job).toMatchObject({
      id: "job-1",
      url: VIDEO_URL,
      title: null,
      label: "1080p MP4",
      status: "running",
      phase: "video",
    });
    expect(events).toEqual([job]);
    expect(lastProcess().args).toContain(`temp:${tempDirOf("job-1")}`);
  });

  it("marks the job as failed when yt-dlp cannot be spawned", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const runner: YtDlpRunner = {
      runJson: async () => {
        throw new Error("not used");
      },
      runStreaming: () => {
        throw new TypeError("spawn EINVAL");
      },
    };
    const manager = createDownloadManager({
      runner,
      downloadDir: mkdtempSync(join(tmpdir(), "ytdl-manager-")),
      createId: () => "job-1",
    });
    const events: Job[] = [];
    manager.subscribe((job) => events.push(job));

    const job = manager.start(VIDEO_REQUEST);

    const failed = {
      status: "error",
      error: { code: "ytdlpFailed", detail: "spawn EINVAL" },
    };
    expect(job).toMatchObject(failed);
    expect(events.at(-1)).toMatchObject(failed);
    expect(manager.cancel("job-1")).toBe(false);
    expect(consoleError).toHaveBeenCalledWith(
      "[downloads] yt-dlp spawn failed for job job-1",
      expect.any(TypeError),
    );
    consoleError.mockRestore();
  });

  it("starts audio jobs in the audio phase", () => {
    const { manager } = setup();
    expect(manager.start(MP3_REQUEST)).toMatchObject({
      phase: "audio",
      label: "MP3 320k",
    });
  });

  it("applies title, progress and phase changes from yt-dlp output", () => {
    const { manager, clock, lastProcess } = setup();
    manager.start(VIDEO_REQUEST);
    lastProcess().emit("[meta] dQw4w9WgXcQ|Never Gonna Give You Up");
    clock.time += 300;
    lastProcess().emit("[dl] avc1.640028|50|100|NA|2000|7");
    expect(manager.list()[0]).toMatchObject({
      title: "Never Gonna Give You Up",
      phase: "video",
      percent: 50,
      speedBytesPerSec: 2000,
      etaSeconds: 7,
    });
    lastProcess().emit("[dl] none|10|100|NA|NA|NA");
    expect(manager.list()[0]).toMatchObject({ phase: "audio", percent: 10 });
    lastProcess().emit("[pp] started|Merger");
    expect(manager.list()[0]).toMatchObject({
      phase: "processing",
      percent: null,
      speedBytesPerSec: null,
      etaSeconds: null,
    });
  });

  it("throttles progress-only updates but emits phase changes at once", () => {
    const { manager, events, clock, lastProcess } = setup();
    manager.start(VIDEO_REQUEST);
    clock.time += 300;
    for (let i = 1; i <= 50; i += 1) {
      lastProcess().emit(`[dl] avc1|${i}|100|NA|NA|NA`);
    }
    expect(events).toHaveLength(2);
    expect(events[1].percent).toBe(1);
    lastProcess().emit("[dl] none|1|100|NA|NA|NA");
    expect(events).toHaveLength(3);
    expect(events[2].phase).toBe("audio");
    clock.time += 250;
    lastProcess().emit("[dl] none|2|100|NA|NA|NA");
    expect(events).toHaveLength(4);
    expect(manager.list()[0].percent).toBe(2);
  });

  it("finishes with the file path and removes the job temp dir", async () => {
    const { manager, lastProcess, tempDirOf } = setup();
    manager.start(VIDEO_REQUEST);
    mkdirSync(tempDirOf("job-1"), { recursive: true });
    writeFileSync(join(tempDirOf("job-1"), "x.f299.mp4.part"), "partial");
    lastProcess().emit("[file] /data/yt/Song [dQw4w9WgXcQ].mp4");
    lastProcess().exit({ kind: "success" });
    await vi.waitFor(() =>
      expect(manager.list()[0]).toMatchObject({
        status: "done",
        percent: 100,
        filePath: "/data/yt/Song [dQw4w9WgXcQ].mp4",
      }),
    );
    expect(existsSync(tempDirOf("job-1"))).toBe(false);
  });

  it("finishes an already-downloaded video that only post-processes", async () => {
    const { manager, lastProcess } = setup();
    manager.start(VIDEO_REQUEST);
    lastProcess().emit(
      "[meta] dQw4w9WgXcQ|Song",
      "[pp] started|Metadata",
      "[pp] started|MoveFiles",
      "[file] /data/yt/Song [dQw4w9WgXcQ].mp4",
    );
    lastProcess().exit({ kind: "success" });
    await vi.waitFor(() =>
      expect(manager.list()[0]).toMatchObject({
        status: "done",
        filePath: "/data/yt/Song [dQw4w9WgXcQ].mp4",
      }),
    );
  });

  it("records yt-dlp failures on the job", async () => {
    const { manager, lastProcess } = setup();
    manager.start(VIDEO_REQUEST);
    lastProcess().exit({
      kind: "failed",
      error: new YtDlpError("ytdlpFailed", "[youtube] x: Video unavailable"),
    });
    await vi.waitFor(() =>
      expect(manager.list()[0]).toMatchObject({
        status: "error",
        error: {
          code: "ytdlpFailed",
          detail: "[youtube] x: Video unavailable",
        },
      }),
    );
  });

  it("cancels a running job and cleans its temp dir", async () => {
    const { manager, lastProcess, tempDirOf } = setup();
    manager.start(VIDEO_REQUEST);
    mkdirSync(tempDirOf("job-1"), { recursive: true });
    expect(manager.cancel("job-1")).toBe(true);
    expect(lastProcess().cancelled).toBe(true);
    lastProcess().exit({ kind: "cancelled" });
    await vi.waitFor(() => expect(manager.list()[0].status).toBe("cancelled"));
    expect(existsSync(tempDirOf("job-1"))).toBe(false);
  });

  it("refuses to cancel unknown or finished jobs", async () => {
    const { manager, lastProcess } = setup();
    expect(manager.cancel("missing")).toBe(false);
    manager.start(VIDEO_REQUEST);
    lastProcess().exit({ kind: "success" });
    await vi.waitFor(() => expect(manager.list()[0].status).toBe("done"));
    expect(manager.cancel("job-1")).toBe(false);
  });

  it("lists newest first and stops notifying after unsubscribe", () => {
    const { manager } = setup();
    const seen: Job[] = [];
    const unsubscribe = manager.subscribe((job) => seen.push(job));
    manager.start(VIDEO_REQUEST);
    unsubscribe();
    manager.start(MP3_REQUEST);
    expect(manager.list().map((job) => job.id)).toEqual(["job-2", "job-1"]);
    expect(seen.map((job) => job.id)).toEqual(["job-1"]);
  });

  it("keeps notifying other listeners when one throws", () => {
    const { manager, events } = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    manager.subscribe(() => {
      throw new Error("closed stream");
    });
    manager.start(VIDEO_REQUEST);
    expect(events).toHaveLength(1);
  });
});

describe("createDownloadManager playlists", () => {
  const ENTRIES: PlaylistEntry[] = ["a1", "b2", "c3"].map((id) => ({
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: `Video ${id}`,
    durationSeconds: 60,
  }));

  function startPlaylist(entries = ENTRIES) {
    const context = setup();
    const outputDir = join(context.downloadDir, "Road trip");
    const job = context.manager.startPlaylist({
      request: VIDEO_REQUEST,
      title: "Road trip",
      outputDir,
      entries,
    });
    const current = () => context.manager.list()[0];
    return { ...context, job, outputDir, current };
  }

  async function finishWithFile(process: FakeProcess, name: string) {
    process.emit(`[file] /v/Road trip/${name}.mp4`);
    process.exit({ kind: "success" });
  }

  it("downloads entries one at a time into the playlist folder", async () => {
    const { job, processes, outputDir, current } = startPlaylist();
    expect(job).toMatchObject({
      title: "Road trip",
      label: "1080p MP4",
      status: "running",
      playlist: { total: 3, downloaded: 0, skipped: [], current: "Video a1" },
    });
    expect(processes).toHaveLength(1);
    const args = processes[0].args;
    expect(args.at(-1)).toBe(ENTRIES[0].url);
    expect(args[args.indexOf("-P") + 1]).toBe(outputDir);
    expect(args).toContain("--match-filter");

    await finishWithFile(processes[0], "a1");
    await vi.waitFor(() => expect(processes).toHaveLength(2));
    expect(processes[1].args.at(-1)).toBe(ENTRIES[1].url);
    expect(current().playlist).toMatchObject({
      downloaded: 1,
      current: "Video b2",
    });
  });

  it("reports overall progress across entries", async () => {
    const { processes, clock, current } = startPlaylist();
    await finishWithFile(processes[0], "a1");
    await vi.waitFor(() => expect(processes).toHaveLength(2));
    clock.time += 300;
    processes[1].emit("[dl] avc1|50|100|NA|1000|5");
    expect(current().percent).toBe(50);
    expect(current().speedBytesPerSec).toBe(1000);
  });

  it("skips failed entries and finishes with a summary", async () => {
    const { processes, outputDir, current } = startPlaylist();
    processes[0].exit({
      kind: "failed",
      error: new YtDlpError("ytdlpFailed", "Private video"),
    });
    await vi.waitFor(() => expect(processes).toHaveLength(2));
    await finishWithFile(processes[1], "b2");
    await vi.waitFor(() => expect(processes).toHaveLength(3));
    // Canlı filtresine takılan girdi dosya yazmadan başarıyla çıkar
    processes[2].exit({ kind: "success" });
    await vi.waitFor(() => expect(current().status).toBe("done"));
    expect(current()).toMatchObject({
      percent: 100,
      filePath: outputDir,
      error: null,
      playlist: {
        total: 3,
        downloaded: 1,
        skipped: ["Video a1", "Video c3"],
        current: null,
      },
    });
  });

  it("fails with the last error when nothing was downloaded", async () => {
    const { processes, current } = startPlaylist(ENTRIES.slice(0, 1));
    processes[0].exit({
      kind: "failed",
      error: new YtDlpError("ytdlpFailed", "Video unavailable"),
    });
    await vi.waitFor(() => expect(current().status).toBe("error"));
    expect(current().error).toEqual({
      code: "ytdlpFailed",
      detail: "Video unavailable",
    });
  });

  it("cancels the running entry and starts no more", async () => {
    const { manager, job, processes, current } = startPlaylist();
    expect(manager.cancel(job.id)).toBe(true);
    expect(processes[0].cancelled).toBe(true);
    processes[0].exit({ kind: "cancelled" });
    await vi.waitFor(() => expect(current().status).toBe("cancelled"));
    expect(processes).toHaveLength(1);
    expect(manager.cancel(job.id)).toBe(false);
  });

  it("stops between entries when cancelled after one finished", async () => {
    const { manager, job, processes, current } = startPlaylist();
    await finishWithFile(processes[0], "a1");
    // Süreç çıktı ama sıradaki henüz başlamadı (geçici klasör siliniyor)
    expect(manager.cancel(job.id)).toBe(true);
    await vi.waitFor(() => expect(current().status).toBe("cancelled"));
    expect(processes).toHaveLength(1);
    expect(current().playlist?.downloaded).toBe(1);
  });
});
