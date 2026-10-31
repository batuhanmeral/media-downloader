import { describe, expect, it } from "vitest";
import { upsertJob } from "./jobs";
import type { Job } from "./types";

function job(id: string, overrides: Partial<Job> = {}): Job {
  return {
    id,
    url: "https://youtu.be/dQw4w9WgXcQ",
    title: null,
    label: "M4A",
    status: "running",
    phase: "audio",
    percent: null,
    speedBytesPerSec: null,
    etaSeconds: null,
    filePath: null,
    error: null,
    playlist: null,
    ...overrides,
  };
}

describe("upsertJob", () => {
  it("prepends unknown jobs", () => {
    expect(upsertJob([job("a")], job("b")).map((j) => j.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("replaces a known job in place", () => {
    const updated = upsertJob([job("b"), job("a")], job("a", { percent: 40 }));
    expect(updated.map((j) => [j.id, j.percent])).toEqual([
      ["b", null],
      ["a", 40],
    ]);
  });
});
