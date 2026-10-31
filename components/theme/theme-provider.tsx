"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/*
 * The theme script only matters in the server-rendered HTML, where it runs before the first paint.
 * When React renders the provider in the browser (a 404 swapped in after the page started), React 19
 * warns about any executable <script> it creates; marking the browser copy as data keeps it inert
 * and silent. The script element already suppresses hydration warnings, so the differing type is fine.
 */
const scriptProps = typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

/**
 * Light, dark or the device's setting (the default). next-themes writes a small script that sets
 * the class on <html> before the first paint, so there is no flash of the wrong theme. The storage
 * key is the one the shop already used, so an earlier choice is kept.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="theme" scriptProps={scriptProps}>
      {children}
    </NextThemesProvider>
  );
}
