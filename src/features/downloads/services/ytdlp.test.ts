// @vitest-environment node
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createYtDlpRunner,
  type ProcessExit,
  type RunningProcess,
} from "./ytdlp";
import { YtDlpError } from "./ytdlp-error";

const FAKE_YT_DLP = fileURLToPath(
  new URL("./__fixtures__/fake-yt-dlp.mjs", import.meta.url),
);
// Node'u binary olarak verip fake script'i ilk argüman yapıyoruz
const runner = createYtDlpRunner(process.execPath);
const missingRunner = createYtDlpRunner("/nonexistent/yt-dlp");

function runToExit(
  scenario: string,
  onStart?: (process: RunningProcess) => void,
): Promise<{ lines: string[]; exit: ProcessExit }> {
  return new Promise((resolve) => {
    const lines: string[] = [];
    const running = runner.runStreaming([FAKE_YT_DLP, scenario], {
      onLine: (line) => lines.push(line),
      onExit: (exit) => resolve({ lines, exit }),
    });
    onStart?.(running);
  });
}

describe("runJson", () => {
  it("parses stdout as JSON", async () => {
    await expect(runner.runJson([FAKE_YT_DLP, "json-ok"])).resolves.toEqual({
      id: "abc",
      title: "Test",
    });
  });

  it("rejects with the last ERROR line on a non-zero exit", async () => {
    await expect(runner.runJson([FAKE_YT_DLP, "fail"])).rejects.toMatchObject({
      code: "ytdlpFailed",
      detail: "[youtube] abc: Video unavailable",
    });
  });

  it("rejects when stdout is not JSON", async () => {
    await expect(
      runner.runJson([FAKE_YT_DLP, "json-invalid"]),
    ).rejects.toMatchObject({
      code: "ytdlpFailed",
      detail: "invalid JSON from yt-dlp",
    });
  });

  it("reports a missing binary", async () => {
    const result = missingRunner.runJson(["-J"]);
    await expect(result).rejects.toBeInstanceOf(YtDlpError);
    await expect(result).rejects.toMatchObject({ code: "binaryMissing" });
  });
});

describe("runStreaming", () => {
  it("emits every stdout line, including a final line without newline", async () => {
    const { lines, exit } = await runToExit("stream-ok");
    expect(lines).toEqual([
      "[meta] abc|Test",
      "[dl] none|50|100|NA|10|5",
      "[file] /tmp/Test [abc].m4a",
    ]);
    expect(exit).toEqual({ kind: "success" });
  });

  it("emits post-processing lines that yt-dlp writes to stderr", async () => {
    const { lines } = await runToExit("stream-pp");
    expect(lines).toEqual(["[pp] started|ExtractAudio"]);
  });

  it("reports failure with the yt-dlp error line", async () => {
    const { exit } = await runToExit("fail");
    expect(exit).toMatchObject({
      kind: "failed",
      error: {
        code: "ytdlpFailed",
        detail: "[youtube] abc: Video unavailable",
      },
    });
  });

  it("stops a running process on cancel within 2 seconds", async () => {
    const startedAt = Date.now();
    const { exit } = await runToExit("hang", (running) => {
      setTimeout(() => running.cancel(), 100);
    });
    expect(exit).toEqual({ kind: "cancelled" });
    expect(Date.now() - startedAt).toBeLessThan(2000);
  });

  it("reports a missing binary exactly once", async () => {
    const exits: ProcessExit[] = [];
    await new Promise<void>((resolve) => {
      missingRunner.runStreaming([], {
        onLine: () => {},
        onExit: (exit) => {
          exits.push(exit);
          resolve();
        },
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(exits).toHaveLength(1);
    expect(exits[0]).toMatchObject({
      kind: "failed",
      error: { code: "binaryMissing" },
    });
  });
});
