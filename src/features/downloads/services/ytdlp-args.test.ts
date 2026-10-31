// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { DownloadRequest } from "../schemas";
import { buildDownloadArgs, buildInfoArgs } from "./ytdlp-args";

const VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const PATHS = {
  outputDir: "/data/yt",
  tempDir: "/data/yt/.yt-downloader-tmp/job-1",
};
const M4A: DownloadRequest = { url: VIDEO_URL, kind: "audio", format: "m4a" };

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

describe("buildInfoArgs", () => {
  it("requests flat JSON capped one past the playlist limit, url after --", () => {
    expect(buildInfoArgs(VIDEO_URL)).toEqual([
      "--ignore-config",
      "-J",
      "--no-playlist",
      "--flat-playlist",
      "--playlist-end",
      "301",
      "--",
      VIDEO_URL,
    ]);
  });
});

describe("buildDownloadArgs", () => {
  it("skips entries that went live only when asked", () => {
    expect(buildDownloadArgs(M4A, PATHS)).not.toContain("--match-filter");
    const args = buildDownloadArgs(M4A, PATHS, { skipLive: true });
    expect(valueAfter(args, "--match-filter")).toBe("!is_live");
    expect(args.slice(-2)).toEqual(["--", VIDEO_URL]);
  });

  it("ends with -- and the url so the url is never read as a flag", () => {
    const args = buildDownloadArgs(M4A, PATHS);
    expect(args.slice(-2)).toEqual(["--", VIDEO_URL]);
    expect(args.filter((arg) => arg === "--")).toHaveLength(1);
  });

  it("ignores yt-dlp config files so a planted yt-dlp.conf is never loaded", () => {
    expect(buildDownloadArgs(M4A, PATHS)[0]).toBe("--ignore-config");
  });

  it("writes finals to the output dir and intermediates to the job temp dir", () => {
    const args = buildDownloadArgs(M4A, PATHS).join(" ");
    expect(args).toContain(
      "-P /data/yt -P temp:/data/yt/.yt-downloader-tmp/job-1",
    );
  });

  it("forces a real download although --print is used", () => {
    expect(buildDownloadArgs(M4A, PATHS)).toContain("--no-simulate");
  });

  it("never downloads playlists and embeds metadata and thumbnail", () => {
    const args = buildDownloadArgs(M4A, PATHS);
    expect(args).toEqual(
      expect.arrayContaining([
        "--no-playlist",
        "--embed-metadata",
        "--embed-thumbnail",
      ]),
    );
  });

  it("prefers H.264 and AAC at the chosen height for MP4", () => {
    const args = buildDownloadArgs(
      { url: VIDEO_URL, kind: "video", height: 1080, container: "mp4" },
      PATHS,
    );
    expect(valueAfter(args, "-f")).toBe("bv*+ba/b");
    expect(valueAfter(args, "-S")).toBe("height:1080,vcodec:h264,acodec:aac");
    expect(valueAfter(args, "--merge-output-format")).toBe("mp4");
    expect(valueAfter(args, "-o")).toBe(
      "%(title)s [%(id)s] %(height)sp.%(ext)s",
    );
  });

  it("only limits the height for MKV", () => {
    const args = buildDownloadArgs(
      { url: VIDEO_URL, kind: "video", height: 2160, container: "mkv" },
      PATHS,
    );
    expect(valueAfter(args, "-S")).toBe("height:2160");
    expect(valueAfter(args, "--merge-output-format")).toBe("mkv");
  });

  it("extracts MP3 at the chosen bitrate", () => {
    const args = buildDownloadArgs(
      { url: VIDEO_URL, kind: "audio", format: "mp3", bitrateKbps: 192 },
      PATHS,
    );
    expect(valueAfter(args, "-f")).toBe("ba/b");
    expect(args).toContain("-x");
    expect(valueAfter(args, "--audio-format")).toBe("mp3");
    expect(valueAfter(args, "--audio-quality")).toBe("192K");
    expect(valueAfter(args, "-o")).toBe("%(title)s [%(id)s] 192k.%(ext)s");
  });

  it("keeps the original AAC stream for M4A", () => {
    const args = buildDownloadArgs(M4A, PATHS);
    expect(valueAfter(args, "-f")).toBe("ba[ext=m4a]/ba/b");
    expect(valueAfter(args, "--audio-format")).toBe("m4a");
    expect(args).not.toContain("--audio-quality");
    expect(valueAfter(args, "-o")).toBe("%(title)s [%(id)s].%(ext)s");
  });
});
