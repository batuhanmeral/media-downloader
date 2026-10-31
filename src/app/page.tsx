import {
  analyzeUrl,
  cancelDownload,
  startDownload,
  startPlaylistDownload,
} from "@/features/downloads/actions";
import { Downloader } from "@/features/downloads/components/downloader";

export default function Page() {
  return (
    <Downloader
      actions={{
        analyzeUrl,
        startDownload,
        startPlaylistDownload,
        cancelDownload,
      }}
    />
  );
}
