import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const display = Bodoni_Moda({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  preload: false,
  variable: "--font-bodoni",
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-hanken",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#14110f" },
  ],
};

// Applies a saved light/dark choice before first paint; without one, CSS follows the phone.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})()`;

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
    <html lang="en-IN" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
