import type { Messages } from "@/i18n/messages/tr";
import type { ActionError } from "../types";

// yt-dlp ayrıntısı çevrilmez; çevrilmiş etiketin arkasına eklenir
export function describeError(t: Messages, error: ActionError): string {
  const label = t.errors[error.code];
  return error.detail ? `${label}: ${error.detail}` : label;
}
