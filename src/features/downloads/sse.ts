export const EVENTS_URL = "/api/downloads/events";

export const SSE_EVENTS = { snapshot: "snapshot", job: "job" } as const;

export type SseEventName = (typeof SSE_EVENTS)[keyof typeof SSE_EVENTS];

// JSON.stringify satır sonlarını kaçırır; her olay tek "data:" satırı olur
export function formatSseEvent(event: SseEventName, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
