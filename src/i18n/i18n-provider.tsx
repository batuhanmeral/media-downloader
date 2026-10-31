"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./locale";
import en from "./messages/en";
import tr, { type Messages } from "./messages/tr";

const MESSAGES: Record<Locale, Messages> = { tr, en };

interface I18nValue {
  locale: Locale;
  t: Messages;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <I18nContext value={{ locale, t: MESSAGES[locale] }}>
      {children}
    </I18nContext>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
