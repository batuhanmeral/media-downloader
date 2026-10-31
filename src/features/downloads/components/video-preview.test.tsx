import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "@/test/render";
import type { VideoInfo } from "../types";
import { pickDefaultHeight } from "./download-options";
import { VideoPreview } from "./video-preview";

const VIDEO_URL = "https://youtu.be/dQw4w9WgXcQ";
const INFO: VideoInfo = {
  id: "dQw4w9WgXcQ",
  title: "Never Gonna Give You Up",
  channel: "Rick Astley",
  durationSeconds: 213,
  thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  videoOptions: [
    { height: 2160, estimatedBytes: 948132545 },
    { height: 1080, estimatedBytes: 171155466 },
    { height: 720, estimatedBytes: null },
  ],
};

function renderPreview(info: VideoInfo = INFO) {
  const onDownload = vi.fn(async () => null);
  renderWithI18n(
    <VideoPreview info={info} url={VIDEO_URL} onDownload={onDownload} />,
  );
  return onDownload;
}

describe("VideoPreview", () => {
  it("shows the title, duration, channel and estimated sizes", () => {
    renderPreview();
    expect(
      screen.getByRole("heading", { name: INFO.title }),
    ).toBeInTheDocument();
    expect(screen.getByText("3:33 · Rick Astley")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /^1080p ≈171,2 MB/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "720p" })).toBeInTheDocument();
  });

  it("downloads 1080p MP4 by default", async () => {
    const onDownload = renderPreview();
    expect(screen.getByRole("radio", { name: /^1080p/ })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "İndir" }));
    expect(onDownload).toHaveBeenCalledWith({
      url: VIDEO_URL,
      kind: "video",
      height: 1080,
      container: "mp4",
    });
  });

  it("downloads the chosen height as MKV", async () => {
    const onDownload = renderPreview();
    await userEvent.click(screen.getByRole("radio", { name: /^2160p/ }));
    await userEvent.click(screen.getByRole("radio", { name: "MKV" }));
    await userEvent.click(screen.getByRole("button", { name: "İndir" }));
    expect(onDownload).toHaveBeenCalledWith({
      url: VIDEO_URL,
      kind: "video",
      height: 2160,
      container: "mkv",
    });
  });

  it("offers MP3 bitrates and M4A for audio", async () => {
    const onDownload = renderPreview();
    await userEvent.click(screen.getByRole("radio", { name: "Ses" }));
    expect(screen.getByRole("radio", { name: "320 kbps" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "192 kbps" }));
    await userEvent.click(screen.getByRole("button", { name: "İndir" }));
    expect(onDownload).toHaveBeenLastCalledWith({
      url: VIDEO_URL,
      kind: "audio",
      format: "mp3",
      bitrateKbps: 192,
    });
    await userEvent.click(screen.getByRole("radio", { name: "M4A" }));
    expect(
      screen.queryByRole("radio", { name: "320 kbps" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "İndir" }));
    expect(onDownload).toHaveBeenLastCalledWith({
      url: VIDEO_URL,
      kind: "audio",
      format: "m4a",
    });
  });

  it("offers only audio when the video has no video formats", () => {
    renderPreview({ ...INFO, videoOptions: [] });
    expect(
      screen.queryByRole("radio", { name: "Video" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Ses" })).toBeChecked();
  });

  it("shows a start error under the button", async () => {
    const onDownload = vi.fn(async () => ({
      code: "binaryMissing" as const,
      detail: null,
    }));
    renderWithI18n(
      <VideoPreview info={INFO} url={VIDEO_URL} onDownload={onDownload} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "İndir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "yt-dlp kurulu değil ya da PATH üzerinde değil.",
    );
  });
});

describe("pickDefaultHeight", () => {
  it("picks the highest height up to 1080, else the lowest available", () => {
    expect(pickDefaultHeight([2160, 1080, 720])).toBe(1080);
    expect(pickDefaultHeight([2160, 1440])).toBe(1440);
    expect(pickDefaultHeight([480, 360])).toBe(480);
  });
});
