import type { Metadata } from "next";
import {
  Inter,
  JetBrains_Mono,
  Playfair_Display,
} from "next/font/google";

import { AgentTicker } from "@/components/agent-ticker";
import { AtmosphericField } from "@/components/atmospheric-field";

import "./globals.css";

// Playfair Display is *only ever italic* on this site — the rule that ties
// every editorial moment together. 700 + 900 cover bold and ultra-bold.
const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rootin4 — Know who's really playing at your seat",
  description:
    "A weather forecast for the seat you bought. Calibrated probabilities for every fixture of the 2026 FIFA World Cup, plus an agent that grades and corrects itself.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="bg-ambient relative min-h-full font-sans text-ink">
        <AtmosphericField />
        <div className="relative z-10 flex min-h-full flex-col pb-24">
          {children}
        </div>
        <AgentTicker />
      </body>
    </html>
  );
}
