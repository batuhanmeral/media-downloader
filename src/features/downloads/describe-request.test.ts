import { describe, expect, it } from "vitest";
import { describeRequest } from "./describe-request";

const url = "https://youtu.be/dQw4w9WgXcQ";

describe("describeRequest", () => {
  it.each([
    [
      { url, kind: "video", height: 1080, container: "mp4" } as const,
      "1080p MP4",
    ],
    [
      { url, kind: "video", height: 2160, container: "mkv" } as const,
      "2160p MKV",
    ],
    [
      { url, kind: "audio", format: "mp3", bitrateKbps: 320 } as const,
      "MP3 320k",
    ],
    [{ url, kind: "audio", format: "m4a" } as const, "M4A"],
  ])("labels %o as %s", (request, label) => {
    expect(describeRequest(request)).toBe(label);
  });
});
