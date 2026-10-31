// @vitest-environment node
import { describe, expect, it } from "vitest";
import { toChannelVideosUrl, toFolderName, toPlaylistInfo } from "./playlist";

const VIDEO = {
  _type: "url",
  ie_key: "Youtube",
  id: "a1",
  url: "https://www.youtube.com/watch?v=a1",
  title: "First",
  duration: 61,
};

describe("toPlaylistInfo", () => {
  it("keeps downloadable videos and counts the rest as excluded", () => {
    const info = toPlaylistInfo({
      _type: "playlist",
      id: "PL1",
      title: "Mix",
      uploader: "Someone",
      entries: [
        VIDEO,
        { ...VIDEO, id: "tab", _type: "playlist", url: undefined },
        { ...VIDEO, id: "tab2", ie_key: "YoutubeTab" },
        { ...VIDEO, id: "live", live_status: "is_live" },
        { ...VIDEO, id: "soon", live_status: "is_upcoming" },
        { ...VIDEO, id: "bad", url: "file:///etc/passwd" },
        null,
      ],
    });
    expect(info).toEqual({
      id: "PL1",
      title: "Mix",
      channel: "Someone",
      entries: [
        {
          id: "a1",
          url: "https://www.youtube.com/watch?v=a1",
          title: "First",
          durationSeconds: 61,
        },
      ],
      excludedCount: 6,
    });
  });

  it("falls back to the id when the playlist has no title", () => {
    expect(toPlaylistInfo({ id: "PL1", entries: [] })).toMatchObject({
      title: "PL1",
      channel: null,
    });
  });

  it("rejects output without an id", () => {
    expect(() => toPlaylistInfo({ entries: [] })).toThrow(
      "unexpected yt-dlp output",
    );
  });
});

describe("toChannelVideosUrl", () => {
  it.each([
    ["https://www.youtube.com/@mixer", "https://www.youtube.com/@mixer/videos"],
    ["https://youtube.com/@mixer/", "https://youtube.com/@mixer/videos"],
    [
      "https://www.youtube.com/channel/UC123",
      "https://www.youtube.com/channel/UC123/videos",
    ],
    ["https://m.youtube.com/c/Name", "https://m.youtube.com/c/Name/videos"],
    [
      "https://www.youtube.com/user/old",
      "https://www.youtube.com/user/old/videos",
    ],
  ])("sends channel root %s to its Videos tab", (input, expected) => {
    expect(toChannelVideosUrl(input)).toBe(expected);
  });

  it.each([
    "https://www.youtube.com/@mixer/shorts",
    "https://www.youtube.com/playlist?list=PL1",
    "https://www.youtube.com/watch?v=a1",
    "https://vimeo.com/@mixer",
  ])("leaves %s alone", (url) => {
    expect(toChannelVideosUrl(url)).toBe(url);
  });
});

describe("toFolderName", () => {
  it("keeps a plain title", () => {
    expect(toFolderName("Road trip 2026", "PL1")).toBe("Road trip 2026");
  });

  it("replaces separators and characters invalid on any OS", () => {
    expect(toFolderName('a/b\\c:d*e?f"g<h>i|j\u0001', "PL1")).toBe(
      "a_b_c_d_e_f_g_h_i_j_",
    );
  });

  it.each(["..", ".", "  ", "...", " . "])(
    "falls back to the playlist id for %j",
    (title) => {
      expect(toFolderName(title, "PL1")).toBe("PL1");
    },
  );

  it("never produces a parent-directory name", () => {
    expect(toFolderName("../../etc", "PL1")).toBe("_.._etc");
    expect(toFolderName("..", "..")).toBe("playlist");
  });

  it.each([
    ".. ",
    "..\u00a0",
    "..\ufeff",
    "..\u3000",
    "..\u2028",
    " ..\u00a0",
    ". ",
  ])("never yields a dot-only name for %j", (title) => {
    const name = toFolderName(title, "PL1");
    expect(name).not.toMatch(/^\.+$/);
    expect(name).not.toMatch(/^[.\s]|[.\s]$/);
  });

  it("blocks variables yt-dlp would expand", () => {
    expect(toFolderName("$HOME ${SECRET} %PATH%", "PL1")).toBe(
      "_HOME _{SECRET} _PATH_",
    );
  });

  it("trims edge dots and caps the length in bytes", () => {
    expect(toFolderName("Best of. ", "PL1")).toBe("Best of");
    expect(toFolderName(".hidden", "PL1")).toBe("hidden");
    expect(toFolderName("x".repeat(400), "PL1")).toHaveLength(200);
    const cjk = toFolderName("歌".repeat(150), "PL1");
    expect(Buffer.byteLength(cjk)).toBeLessThanOrEqual(200);
    expect(cjk).toBe("歌".repeat(66));
  });
});
