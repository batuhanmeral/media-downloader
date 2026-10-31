import { describe, expect, it } from "vitest";
import { isLocale, resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("prefers a valid cookie", () => {
    expect(resolveLocale("en", "tr-TR,tr;q=0.9")).toBe("en");
  });

  it("uses Turkish when the browser's first language is Turkish", () => {
    expect(resolveLocale(undefined, "tr-TR,tr;q=0.9,en;q=0.8")).toBe("tr");
  });

  it("falls back to English otherwise", () => {
    expect(resolveLocale(undefined, "de-DE,tr;q=0.5")).toBe("en");
    expect(resolveLocale("xx", null)).toBe("en");
  });
});

describe("isLocale", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("tr")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale(1)).toBe(false);
  });
});
