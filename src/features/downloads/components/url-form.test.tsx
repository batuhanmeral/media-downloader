import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "@/test/render";
import { UrlForm } from "./url-form";

const VIDEO_URL = "https://youtu.be/dQw4w9WgXcQ";

async function submit(url: string) {
  await userEvent.type(screen.getByLabelText("Video linki"), url);
  await userEvent.click(screen.getByRole("button", { name: "Analiz et" }));
}

describe("UrlForm", () => {
  it("rejects a non-http link without calling the server", async () => {
    const onAnalyze = vi.fn(async () => null);
    renderWithI18n(<UrlForm onAnalyze={onAnalyze} />);
    await submit("ftp://example.com/video");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Geçerli bir http(s) linki gir.",
    );
    expect(screen.getByLabelText("Video linki")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it("sends the trimmed link for analysis", async () => {
    const onAnalyze = vi.fn(async () => null);
    renderWithI18n(<UrlForm onAnalyze={onAnalyze} />);
    await submit(`  ${VIDEO_URL}  `);
    expect(onAnalyze).toHaveBeenCalledWith(VIDEO_URL);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the server error with yt-dlp's detail", async () => {
    const onAnalyze = vi.fn(async () => ({
      code: "ytdlpFailed" as const,
      detail: "[youtube] x: Video unavailable",
    }));
    renderWithI18n(<UrlForm onAnalyze={onAnalyze} />);
    await submit(VIDEO_URL);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "yt-dlp başarısız oldu: [youtube] x: Video unavailable",
    );
  });

  it("explains that live streams can't be downloaded", async () => {
    const onAnalyze = vi.fn(async () => ({
      code: "liveNotSupported" as const,
      detail: null,
    }));
    renderWithI18n(<UrlForm onAnalyze={onAnalyze} />);
    await submit(VIDEO_URL);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Canlı yayınlar indirilemez.",
    );
  });
});
