import type { Metadata } from "next";
import { Big_Shoulders, Instrument_Sans, JetBrains_Mono, Noto_Sans_Tamil } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const display = Big_Shoulders({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--ff-display",
  display: "swap",
});
const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--ff-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--ff-mono",
  display: "swap",
});
const tamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "600"],
  variable: "--ff-tamil",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Storyboard — turn an idea into a short film",
  description:
    "Write one line and get a vertical short film: an original cast, AI-filmed scenes with spoken dialogue, music, captions and post copy. English or Tamil.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} ${tamil.variable}`}
    >
      <body className="bg-aurora grain min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
