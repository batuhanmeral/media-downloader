import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { getLocale } from "@/i18n/get-locale";
import { I18nProvider } from "@/i18n/i18n-provider";
import { APP_NAME } from "@/lib/app";
import "./globals.css";

// Dil çerezden okunuyor; cacheComponents altında bu segmentin beklemesine izin ver
export const instant = false;

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Local video and audio downloader",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${plexSans.variable} ${plexMono.variable} antialiased`}
    >
      <body className="min-h-dvh bg-bg font-sans text-fg">
        <I18nProvider locale={locale}>
          <div className="mx-auto flex max-w-[720px] flex-col gap-8 px-4 py-8">
            <AppHeader />
            {children}
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
