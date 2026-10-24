"use client";

import { ThemeProvider as NextThemes } from "next-themes";

/** Light/dark via `data-mode` on <html> (matches the skin CSS). Skins without a dark variant are forced light. */
export function ThemeProvider({ children, allowDark }: { children: React.ReactNode; allowDark: boolean }) {
  return (
    <NextThemes
      attribute="data-mode"
      defaultTheme="light"
      enableSystem={false}
      forcedTheme={allowDark ? undefined : "light"}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemes>
  );
}
