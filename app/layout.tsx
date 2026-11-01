import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { Bodoni_Moda, Instrument_Sans } from "next/font/google";
import { resolve } from "@/lib/design/tokens";
import { env } from "@/lib/env";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const display = Bodoni_Moda({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  preload: false,
  variable: "--font-bodoni",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-instrument",
});

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { APP_URL, HIDE_FROM_SEARCH } = env();
  return {
    metadataBase: new URL(APP_URL),
    formatDetection: { telephone: false },
    // A demo or test copy of the shop stays out of search results; pages that set their own robots are noindex already.
    ...(HIDE_FROM_SEARCH === "true" ? { robots: { index: false, follow: false } } : {}),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: resolve("light").canvas },
    { media: "(prefers-color-scheme: dark)", color: resolve("dark").canvas },
  ],
};

/*
 * Every page renders at request time from cached data (DECISIONS.md 23). Marking the root
 * layout as request-time means no empty shell is prerendered and sent first, so each response
 * carries its real status code (404, 307), crawlers get the whole page in the first HTML, and
 * pages work without JavaScript. `instant = false` declares that this is intended.
 */
export const instant = false;

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();
  return (
    // next-themes sets the theme class on <html> before React hydrates.
    <html lang="en-IN" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
