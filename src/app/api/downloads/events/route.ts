import { connection } from "next/server";
import { getDownloads } from "@/features/downloads/server";
import { formatSseEvent, SSE_EVENTS } from "@/features/downloads/sse";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

export async function GET(request: Request): Promise<Response> {
  // Canlı akış: build sırasında prerender edilmemeli
  await connection();
  const downloads = getDownloads();
  const encoder = new TextEncoder();
  let unsubscribe: () => void = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Kapanmış akışa yazmak hata verir; dinleyici sızmasın diye abonelik bırakılır
      const send = (event: string) => {
        try {
          controller.enqueue(encoder.encode(event));
        } catch {
          unsubscribe();
        }
      };
      send(formatSseEvent(SSE_EVENTS.snapshot, downloads.list()));
      unsubscribe = downloads.subscribe((job) =>
        send(formatSseEvent(SSE_EVENTS.job, job)),
      );
      if (request.signal.aborted) unsubscribe();
      else request.signal.addEventListener("abort", () => unsubscribe());
    },
    cancel() {
      unsubscribe();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
