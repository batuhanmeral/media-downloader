import { describe, expect, it } from "vitest";
import { isLocalHost } from "./local-host";

describe("isLocalHost", () => {
  it.each([
    "localhost:3000",
    "127.0.0.1:3000",
    "[::1]:3000",
    "LOCALHOST",
    "127.0.0.1",
  ])("accepts %s", (host) => {
    expect(isLocalHost(host)).toBe(true);
  });

  it.each([
    null,
    "",
    "evil.example",
    "localhost.evil.example:3000",
    "127.0.0.1.nip.io",
    "192.168.1.20:3000",
    "[::1]evil.com",
    "localhost:evil",
    "localhost:3000:x",
  ])("rejects %s", (host) => {
    expect(isLocalHost(host)).toBe(false);
  });
});
