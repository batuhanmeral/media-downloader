export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "locale";

const DEFAULT_LOCALE: Locale = "en";
const TURKISH_PREFIX = "tr";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}

// Çerez yoksa tarayıcının ilk dili belirler: tr ise Türkçe, değilse İngilizce
export function resolveLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  const primary = acceptLanguage?.split(",")[0]?.trim().toLowerCase() ?? "";
  return primary.startsWith(TURKISH_PREFIX) ? "tr" : DEFAULT_LOCALE;
}
