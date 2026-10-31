"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE, type Locale } from "./locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Çerez değişince Next.js sayfayı sunucuda yeniden render eder; ayrıca refresh gerekmez
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) throw new Error("Unsupported locale");
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
}
