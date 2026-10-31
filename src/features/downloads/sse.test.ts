import { describe, expect, it } from "vitest";
import { formatSseEvent } from "./sse";

describe("formatSseEvent", () => {
  it("writes a named event with a single JSON data line", () => {
    expect(formatSseEvent("job", { title: "a\nb" })).toBe(
      'event: job\ndata: {"title":"a\\nb"}\n\n',
    );
  });
});
