// @vitest-environment node
import { describe, expect, it } from "vitest";
import info4k from "./__fixtures__/info-4k.json";
import { isLiveNow, isPlaylist, toVideoInfo } from "./format-options";
import { YtDlpError } from "./ytdlp-error";

const LARGEST_AUDIO_BYTES = 5205204;

describe("toVideoInfo", () => {
  it("maps the video metadata", () => {
    expect(toVideoInfo(info4k)).toMatchObject({
      id: "LXb3EKWsInQ",
      title: "COSTA RICA IN 4K 60fps HDR (ULTRA HD)",
      channel: "Jacob + Katie Schwarz",
      durationSeconds: 314,
      thumbnailUrl:
        "https://i.ytimg.com/vi_webp/LXb3EKWsInQ/maxresdefault.webp",
    });
  });

  it("lists distinct video heights, highest first, without storyboards", () => {
    const heights = toVideoInfo(info4k).videoOptions.map((o) => o.height);
    expect(heights).toEqual([2160, 1440, 1080, 360, 144]);
  });

  it("estimates size as the largest video at that height plus the largest audio", () => {
    const options = toVideoInfo(info4k).videoOptions;
    expect(options.find((o) => o.height === 2160)?.estimatedBytes).toBe(
      942927341 + LARGEST_AUDIO_BYTES,
    );
    expect(options.find((o) => o.height === 1080)?.estimatedBytes).toBe(
      165950262 + LARGEST_AUDIO_BYTES,
    );
  });

  it("returns null size when no format at that height reports one", () => {
    const options = toVideoInfo(info4k).videoOptions;
    expect(options.find((o) => o.height === 1440)?.estimatedBytes).toBeNull();
  });

  it("uses filesize_approx and the video size alone when audio size is unknown", () => {
    const info = toVideoInfo({
      id: "x",
      title: "x",
      formats: [
        {
          vcodec: "avc1",
          acodec: "none",
          height: 720,
          filesize: null,
          filesize_approx: 1000,
        },
        { vcodec: "none", acodec: "opus", height: null, filesize: null },
      ],
    });
    expect(info.videoOptions).toEqual([{ height: 720, estimatedBytes: 1000 }]);
  });

  it("keeps an https thumbnail from any site", () => {
    const thumbnail = "https://i.vimeocdn.com/video/1-d_640";
    expect(toVideoInfo({ id: "x", title: "x", thumbnail }).thumbnailUrl).toBe(
      thumbnail,
    );
  });

  it.each([
    "http://i.ytimg.com/vi/x/maxresdefault.jpg",
    "data:image/png;base64,AAAA",
    "not a url",
  ])("drops the non-https thumbnail %s", (thumbnail) => {
    expect(toVideoInfo({ id: "x", title: "x", thumbnail }).thumbnailUrl).toBe(
      null,
    );
  });

  it("falls back to uploader and nulls for missing optional fields", () => {
    expect(toVideoInfo({ id: "x", title: "x", uploader: "Someone" })).toEqual({
      id: "x",
      title: "x",
      channel: "Someone",
      durationSeconds: null,
      thumbnailUrl: null,
      videoOptions: [],
    });
  });

  it("treats formats with an unknown video codec but a height as video", () => {
    const info = toVideoInfo({
      id: "x",
      title: "x",
      formats: [
        { vcodec: null, acodec: null, height: 720 },
        { vcodec: "none", acodec: "mp4a", height: null },
      ],
    });
    expect(info.videoOptions.map((o) => o.height)).toEqual([720]);
  });

  it("throws a yt-dlp error for an unexpected shape", () => {
    expect(() => toVideoInfo({ nope: true })).toThrow(YtDlpError);
    expect(() => toVideoInfo("not json")).toThrow("unexpected yt-dlp output");
  });
});

describe("isLiveNow", () => {
  it.each([
    { id: "x", title: "x", is_live: true },
    { id: "x", title: "x", live_status: "is_live" },
  ])("detects a stream that is live now: %o", (raw) => {
    expect(isLiveNow(raw)).toBe(true);
  });

  it.each([
    { ...info4k, is_live: false, live_status: "was_live" },
    { ...info4k, live_status: "not_live" },
    info4k,
    { id: "x", title: "x", is_live: null, live_status: null },
  ])("accepts videos that are not live now", (raw) => {
    expect(isLiveNow(raw)).toBe(false);
  });
});

describe("isPlaylist", () => {
  it("detects playlist and channel output", () => {
    expect(isPlaylist({ _type: "playlist", id: "PL1", title: "x" })).toBe(true);
  });

  it.each([info4k, { _type: "video" }, null])(
    "accepts single videos",
    (raw) => {
      expect(isPlaylist(raw)).toBe(false);
    },
  );
});
