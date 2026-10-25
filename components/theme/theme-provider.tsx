"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Light, dark or the device's setting (the default). next-themes writes a small script that sets
 * the class on <html> before the first paint, so there is no flash of the wrong theme. The storage
 * key is the one the shop already used, so an earlier choice is kept.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="theme">
      {children}
    </NextThemesProvider>
  );
}
