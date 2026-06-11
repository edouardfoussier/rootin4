import type { Metadata } from "next";
import { Anton, Inter, JetBrains_Mono } from "next/font/google";

import { AgentTicker } from "@/components/agent-ticker";
import { AtmosphericField } from "@/components/atmospheric-field";

import "./globals.css";

// Anton carries the tournament-poster energy: one heavy condensed cut,
// always uppercase (handled by .font-display). Italic accents lean on
// the synthetic slant — reads like a speed skew, on brand for matchday.
const anton = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
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
    "A weather forecast for the seat you bought. Calibrated probabilities for every match of the 2026 FIFA World Cup, plus an agent that corrects itself.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
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
