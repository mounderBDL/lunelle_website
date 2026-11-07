import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Niconne } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const script = Niconne({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  variable: "--font-niconne",
  display: "swap",
});

const sans = Jost({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Lunelle | The poetry of scent", template: "%s | Lunelle" },
  description: "Mists, musks and perfumes. The poetry of scent.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable} ${script.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}