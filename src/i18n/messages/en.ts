import type { Messages } from "./tr";

const en: Messages = {
  locale: { label: "Language" },
  form: {
    urlLabel: "Video link",
    urlPlaceholder: "https://…",
    analyze: "Analyze",
    analyzing: "Analyzing…",
  },
  options: {
    kindLegend: "Type",
    video: "Video",
    audio: "Audio",
    resolutionLegend: "Resolution",
    maxResolutionLegend: "Max resolution",
    containerLegend: "Video format",
    audioFormatLegend: "Audio format",
    bitrateLegend: "Quality",
    download: "Download",
    starting: "Starting…",
  },
  playlist: {
    videoCount: "{count} videos",
    excluded: "{count} unavailable videos left out.",
  },
  list: {
    heading: "Downloads",
    empty: "No downloads yet.",
    cancel: "Cancel",
    eta: "{time} left",
    savedTo: "Saved to",
    playlistSummary: "{downloaded} downloaded, {skipped} skipped",
    skippedHeading: "Skipped videos ({count})",
    phase: {
      video: "downloading video",
      audio: "downloading audio",
      processing: "processing",
    },
    status: { done: "Done", error: "Error", cancelled: "Cancelled" },
  },
  errors: {
    invalidUrl: "Enter a valid http(s) link.",
    invalidRequest: "Invalid download selection.",
    binaryMissing: "yt-dlp is not installed or not on PATH.",
    ytdlpFailed: "yt-dlp failed",
    notFound: "Download not found.",
    liveNotSupported: "Live streams can't be downloaded.",
    emptyPlaylist: "This playlist has no downloadable videos.",
    playlistTooLong: "Only playlists with up to 300 videos can be downloaded.",
    unexpected: "Something went wrong.",
  },
};

export default en;
