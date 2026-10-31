// @vitest-environment node
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "ytdl-env-"));
}

describe("parseEnv", () => {
  it("accepts an absolute, writable directory", () => {
    const dir = makeTempDir();
    expect(parseEnv({ DOWNLOAD_DIR: dir })).toEqual({ DOWNLOAD_DIR: dir });
  });

  it("rejects a missing DOWNLOAD_DIR", () => {
    expect(() => parseEnv({})).toThrow(/DOWNLOAD_DIR is required/);
  });

  it("rejects a relative path", () => {
    expect(() => parseEnv({ DOWNLOAD_DIR: "downloads" })).toThrow(
      /absolute path/,
    );
  });

  it("rejects a path that does not exist", () => {
    const missing = join(makeTempDir(), "missing");
    expect(() => parseEnv({ DOWNLOAD_DIR: missing })).toThrow(
      /existing, writable directory/,
    );
  });

  it("rejects a file instead of a directory", () => {
    const file = join(makeTempDir(), "file.txt");
    writeFileSync(file, "x");
    expect(() => parseEnv({ DOWNLOAD_DIR: file })).toThrow(
      /existing, writable directory/,
    );
  });

  it("rejects a read-only directory", () => {
    const dir = makeTempDir();
    chmodSync(dir, 0o500);
    expect(() => parseEnv({ DOWNLOAD_DIR: dir })).toThrow(
      /existing, writable directory/,
    );
  });
});
