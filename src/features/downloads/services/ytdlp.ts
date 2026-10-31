import "server-only";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { extractErrorMessage } from "./progress-parser";
import { YtDlpError } from "./ytdlp-error";

const DEFAULT_BINARY = "yt-dlp";
const MISSING_BINARY_CODE = "ENOENT";

export type ProcessExit =
  | { kind: "success" }
  | { kind: "cancelled" }
  | { kind: "failed"; error: YtDlpError };

export interface StreamHandlers {
  onLine(line: string): void;
  onExit(exit: ProcessExit): void;
}

export interface RunningProcess {
  cancel(): void;
}

export interface YtDlpRunner {
  runJson(args: string[]): Promise<unknown>;
  runStreaming(args: string[], handlers: StreamHandlers): RunningProcess;
}

export function createYtDlpRunner(
  binary: string = DEFAULT_BINARY,
): YtDlpRunner {
  return {
    runJson: (args) => runJson(binary, args),
    runStreaming: (args, handlers) => runStreaming(binary, args, handlers),
  };
}

function runJson(binary: string, args: string[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // Shell yok: argümanlar olduğu gibi process'e geçer
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => reject(toSpawnError(error)));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new YtDlpError("ytdlpFailed", extractErrorMessage(stderr)));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(stdout).toString("utf8")));
      } catch {
        reject(new YtDlpError("ytdlpFailed", "invalid JSON from yt-dlp"));
      }
    });
  });
}

function runStreaming(
  binary: string,
  args: string[],
  handlers: StreamHandlers,
): RunningProcess {
  const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  let cancelled = false;
  let exited = false;

  // spawn hatasında hem "error" hem "close" gelebilir; çıkış bir kez bildirilir
  const finish = (exit: ProcessExit): void => {
    if (exited) return;
    exited = true;
    handlers.onExit(exit);
  };

  createInterface({ input: child.stdout }).on("line", (line) =>
    handlers.onLine(line),
  );
  // yt-dlp işlem sonrası (postprocess) ilerlemesini stderr'e yazar
  createInterface({ input: child.stderr }).on("line", (line) => {
    stderr += `${line}\n`;
    handlers.onLine(line);
  });
  child.on("error", (error) =>
    finish({ kind: "failed", error: toSpawnError(error) }),
  );
  child.on("close", (code) => {
    if (cancelled) return finish({ kind: "cancelled" });
    if (code === 0) return finish({ kind: "success" });
    finish({
      kind: "failed",
      error: new YtDlpError("ytdlpFailed", extractErrorMessage(stderr)),
    });
  });

  return {
    cancel() {
      if (exited || child.exitCode !== null || child.signalCode !== null)
        return;
      cancelled = true;
      child.kill("SIGTERM");
    },
  };
}

function toSpawnError(error: NodeJS.ErrnoException): YtDlpError {
  return error.code === MISSING_BINARY_CODE
    ? new YtDlpError("binaryMissing", null)
    : new YtDlpError("ytdlpFailed", error.message);
}
