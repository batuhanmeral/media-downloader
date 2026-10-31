import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDuration,
  formatPercent,
  formatSpeed,
} from "./format";

describe("formatBytes", () => {
  it.each([
    [512, "en", "512 B"],
    [171155466, "en", "171.2 MB"],
    [171155466, "tr", "171,2 MB"],
    [1_500_000_000, "en", "1.5 GB"],
  ])("formats %d in %s as %s", (bytes, locale, expected) => {
    expect(formatBytes(bytes, locale)).toBe(expected);
  });
});

describe("formatSpeed", () => {
  it("adds a per-second unit", () => {
    expect(formatSpeed(4_200_000, "en")).toBe("4.2 MB/s");
  });
});

describe("formatDuration", () => {
  it.each([
    [19, "0:19"],
    [213, "3:33"],
    [3723, "1:02:03"],
    [7.6, "0:08"],
  ])("formats %d seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe("formatPercent", () => {
  it("formats per locale without decimals", () => {
    expect(formatPercent(62.4, "en")).toBe("62%");
    expect(formatPercent(62.4, "tr")).toBe("%62");
  });
});
