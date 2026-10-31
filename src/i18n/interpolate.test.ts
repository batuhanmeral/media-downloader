import { describe, expect, it } from "vitest";
import { interpolate } from "./interpolate";

describe("interpolate", () => {
  it("replaces named placeholders", () => {
    expect(interpolate("{time} kaldı", { time: "0:08" })).toBe("0:08 kaldı");
  });

  it("leaves unknown placeholders visible", () => {
    expect(interpolate("{missing} left", {})).toBe("{missing} left");
  });
});
