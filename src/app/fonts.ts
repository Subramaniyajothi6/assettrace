import {
  Archivo,
  DM_Sans,
  Fraunces,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Instrument_Sans,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
  Space_Grotesk,
  Space_Mono,
  Urbanist,
} from "next/font/google";

// Default skin ("warm") fonts are preloaded; the other skins' fonts load only when used.
const urbanist = Urbanist({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-urbanist" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], preload: false, weight: ["400", "500", "600", "700"], variable: "--font-plex" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], preload: false, weight: ["500"], variable: "--font-plex-mono" });
const fraunces = Fraunces({ subsets: ["latin"], preload: false, weight: ["400", "500", "600"], variable: "--font-fraunces" });
const instrument = Instrument_Sans({ subsets: ["latin"], preload: false, weight: ["400", "500", "600", "700"], variable: "--font-instrument" });
const grotesk = Space_Grotesk({ subsets: ["latin"], preload: false, weight: ["400", "500", "600", "700"], variable: "--font-grotesk" });
const spaceMono = Space_Mono({ subsets: ["latin"], preload: false, weight: ["400", "700"], variable: "--font-space-mono" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], preload: false, weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta" });
const archivo = Archivo({ subsets: ["latin"], preload: false, weight: ["400", "500", "600", "700", "800"], variable: "--font-archivo" });
const dm = DM_Sans({ subsets: ["latin"], preload: false, weight: ["400", "500", "600", "700"], variable: "--font-dm" });

export const fontVariables = [urbanist, jetbrains, plex, plexMono, fraunces, instrument, grotesk, spaceMono, jakarta, archivo, dm]
  .map((f) => f.variable)
  .join(" ");
