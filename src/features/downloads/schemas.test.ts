import { describe, expect, it } from "vitest";
import { downloadRequestSchema, mediaUrlSchema } from "./schemas";

const VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

describe("mediaUrlSchema", () => {
  it.each([
    VIDEO_URL,
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://vimeo.com/123456",
    "https://x.com/someone/status/1234567890",
    "http://example.com/video.mp4",
  ])("accepts %s", (url) => {
    expect(mediaUrlSchema.safeParse(url).success).toBe(true);
  });

  it.each([
    "",
    "not a url",
    "-o /etc/passwd",
    "ftp://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "file:///etc/passwd",
    `https://example.com/${"a".repeat(2048)}`,
  ])("rejects %s", (url) => {
    expect(mediaUrlSchema.safeParse(url).success).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    expect(mediaUrlSchema.parse(`  ${VIDEO_URL}  `)).toBe(VIDEO_URL);
  });

  it("passes the normalized url instead of the raw backslash url", () => {
    expect(
      mediaUrlSchema.parse("http://www.youtube.com\\shorts\\AAAAAAAAAAA"),
    ).toBe("http://www.youtube.com/shorts/AAAAAAAAAAA");
  });

  it("never passes raw control characters through", () => {
    expect(mediaUrlSchema.parse(`${VIDEO_URL}&x=\u0000y`)).toBe(
      `${VIDEO_URL}&x=%00y`,
    );
  });
});

describe("downloadRequestSchema", () => {
  it.each([
    { url: VIDEO_URL, kind: "video", height: 1080, container: "mp4" },
    { url: VIDEO_URL, kind: "video", height: 2160, container: "mkv" },
    { url: VIDEO_URL, kind: "audio", format: "mp3", bitrateKbps: 192 },
    { url: VIDEO_URL, kind: "audio", format: "m4a" },
  ])("accepts %o", (request) => {
    expect(downloadRequestSchema.safeParse(request).success).toBe(true);
  });

  it("replaces the request url with the normalized url", () => {
    const parsed = downloadRequestSchema.parse({
      url: `  ${VIDEO_URL}  `,
      kind: "audio",
      format: "m4a",
    });
    expect(parsed.url).toBe(VIDEO_URL);
  });

  it.each([
    { url: VIDEO_URL, kind: "video", height: 1080, container: "avi" },
    { url: VIDEO_URL, kind: "video", height: -1, container: "mp4" },
    { url: VIDEO_URL, kind: "video", height: 1080.5, container: "mp4" },
    { url: VIDEO_URL, kind: "audio", format: "mp3", bitrateKbps: 256 },
    { url: VIDEO_URL, kind: "audio", format: "flac" },
    { url: "file:///etc/passwd", kind: "audio", format: "m4a" },
    { kind: "audio", format: "m4a" },
  ])("rejects %o", (request) => {
    expect(downloadRequestSchema.safeParse(request).success).toBe(false);
  });

  it("drops unknown keys", () => {
    const parsed = downloadRequestSchema.parse({
      url: VIDEO_URL,
      kind: "audio",
      format: "m4a",
      exec: "rm -rf ~",
    });
    expect(parsed).toEqual({ url: VIDEO_URL, kind: "audio", format: "m4a" });
  });
});
