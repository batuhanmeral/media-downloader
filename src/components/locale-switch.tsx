"use client";

import { useTransition } from "react";
import { useI18n } from "@/i18n/i18n-provider";
import { LOCALES, type Locale } from "@/i18n/locale";

interface LocaleSwitchProps {
  onSelect: (locale: Locale) => Promise<void>;
}

export function LocaleSwitch({ onSelect }: LocaleSwitchProps) {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <div role="group" aria-label={t.locale.label} className="flex gap-1">
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === locale}
          disabled={pending}
          onClick={() => startTransition(() => onSelect(option))}
          className="rounded-ui border border-fg px-2 py-1 font-mono text-xs aria-pressed:bg-fg aria-pressed:text-bg disabled:opacity-60"
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
