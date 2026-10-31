import type { JobErrorCode } from "../types";

export class YtDlpError extends Error {
  readonly code: JobErrorCode;
  readonly detail: string | null;

  constructor(code: JobErrorCode, detail: string | null) {
    super(detail ?? code);
    this.name = "YtDlpError";
    this.code = code;
    this.detail = detail;
  }
}
