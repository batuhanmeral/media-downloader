"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n/i18n-provider";
import { mediaUrlSchema } from "../schemas";
import type { ActionError } from "../types";
import { describeError } from "./describe-error";

const INPUT_ID = "video-url";
const ERROR_ID = "video-url-error";

interface UrlFormProps {
  onAnalyze: (url: string) => Promise<ActionError | null>;
}

export function UrlForm({ onAnalyze }: UrlFormProps) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<ActionError | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = mediaUrlSchema.safeParse(url);
    if (!parsed.success) {
      setError({ code: "invalidUrl", detail: null });
      return;
    }
    setPending(true);
    setError(null);
    try {
      setError(await onAnalyze(parsed.data));
    } catch (cause) {
      console.error("[downloads] analyze failed", cause);
      setError({ code: "unexpected", detail: null });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <label htmlFor={INPUT_ID} className="text-ui font-medium">
        {t.form.urlLabel}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={INPUT_ID}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={t.form.urlPlaceholder}
          aria-invalid={error !== null}
          aria-describedby={error ? ERROR_ID : undefined}
          className="min-w-0 flex-1 rounded-ui border border-fg bg-surface px-3 py-2 font-mono text-ui placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-ui bg-accent px-4 py-2 text-ui font-semibold text-accent-fg disabled:opacity-60"
        >
          {pending ? t.form.analyzing : t.form.analyze}
        </button>
      </div>
      {error && (
        <p id={ERROR_ID} role="alert" className="text-ui text-danger">
          {describeError(t, error)}
        </p>
      )}
    </form>
  );
}
