import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const sans = Jost({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Lunelle | The poetry of scent", template: "%s | Lunelle" },
  description: "Mists, musks, perfumes. The poetry of scent.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}