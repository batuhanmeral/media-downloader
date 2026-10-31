import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { I18nProvider } from "@/i18n/i18n-provider";
import type { Locale } from "@/i18n/locale";

export function renderWithI18n(
  ui: ReactElement,
  locale: Locale = "tr",
): RenderResult {
  return render(<I18nProvider locale={locale}>{ui}</I18nProvider>);
}
