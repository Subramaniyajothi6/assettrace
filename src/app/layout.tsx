import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { getSettings } from "@/server/settings";
import { skinHasDark } from "@/lib/skins";

export const metadata: Metadata = {
  title: { default: "AssetTrace", template: "%s · AssetTrace" },
  description: "AssetTrace: company asset lifecycle management, from registration to retirement.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { uiSkin } = await getSettings();
  return (
    <html lang="en" data-skin={uiSkin} className={fontVariables} suppressHydrationWarning>
      <body>
        <ThemeProvider allowDark={skinHasDark(uiSkin)}>
          {children}
          <Toaster position="bottom-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
