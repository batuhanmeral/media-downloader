// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extractErrorMessage, parseOutputLine } from "./progress-parser";

describe("parseOutputLine", () => {
  it("parses video stream progress", () => {
    const event = parseOutputLine(
      "[dl] avc1.4D400C|130048|433081|NA|13569015.313614767|0",
    );
    expect(event).toMatchObject({
      type: "progress",
      stream: "video",
      speedBytesPerSec: 13569015.313614767,
      etaSeconds: 0,
    });
    expect(event?.type === "progress" && event.percent).toBeCloseTo(30.03, 2);
  });

  it("treats a stream without video codec as audio", () => {
    expect(parseOutputLine("[dl] none|309288|309288|NA|NA|NA")).toEqual({
      type: "progress",
      stream: "audio",
      percent: 100,
      speedBytesPerSec: null,
      etaSeconds: null,
    });
  });

  it("falls back to the estimated total", () => {
    expect(parseOutputLine("[dl] vp9|500|NA|1000|NA|NA")).toMatchObject({
      percent: 50,
    });
  });

  it("reports unknown percent when no total is known", () => {
    expect(parseOutputLine("[dl] none|1024|NA|NA|NA|NA")).toMatchObject({
      percent: null,
    });
  });

  it("caps percent at 100", () => {
    expect(parseOutputLine("[dl] vp9|2000|1000|NA|NA|NA")).toMatchObject({
      percent: 100,
    });
  });

  it("emits post-processing starts and ignores finishes", () => {
    expect(parseOutputLine("[pp] started|Merger")).toEqual({
      type: "postprocess",
      name: "Merger",
    });
    expect(parseOutputLine("[pp] finished|Merger")).toBeNull();
  });

  it("keeps separators and special characters inside the title", () => {
    expect(
      parseOutputLine('[meta] LXb3EKWsInQ|Çok "güzel" | 4K / HDR'),
    ).toEqual({
      type: "meta",
      videoId: "LXb3EKWsInQ",
      title: 'Çok "güzel" | 4K / HDR',
    });
  });

  it("parses the final file path", () => {
    expect(
      parseOutputLine("[file] /home/u/Videos/Me at the zoo [jNQXAC9IVRw].mp4"),
    ).toEqual({
      type: "file",
      path: "/home/u/Videos/Me at the zoo [jNQXAC9IVRw].mp4",
    });
  });

  it.each([
    "",
    "[youtube] Extracting URL",
    "[dl] broken",
    "[meta] no-separator",
  ])("ignores %j", (line) => {
    expect(parseOutputLine(line)).toBeNull();
  });
});

describe("extractErrorMessage", () => {
  it("returns the last ERROR line without its prefix", () => {
    const stderr =
      "WARNING: something odd\nERROR: first\nERROR: [youtube] aaaaaaaaaaa: This video is unavailable\n";
    expect(extractErrorMessage(stderr)).toBe(
      "[youtube] aaaaaaaaaaa: This video is unavailable",
    );
  });

  it("returns null when there is no ERROR line", () => {
    expect(extractErrorMessage("WARNING: only a warning\n")).toBeNull();
  });

  it("truncates very long messages", () => {
    const message = extractErrorMessage(`ERROR: ${"x".repeat(2000)}`);
    expect(message).toHaveLength(500);
  });
});
