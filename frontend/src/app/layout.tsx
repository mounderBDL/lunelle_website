import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Niconne } from "next/font/google";
import { getLocale } from "next-intl/server";
import { SITE_URL } from "@/lib/site";
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
  metadataBase: new URL(SITE_URL),
  openGraph: { siteName: "Lunelle", type: "website" },
  title: { default: "Lunelle | The poetry of scent", template: "%s | Lunelle" },
  description: "Mists, musks and perfumes. The poetry of scent.",
};

const INTRO_SCRIPT = `try{if(location.pathname==="/"&&!sessionStorage.getItem("lunelle-intro")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){sessionStorage.setItem("lunelle-intro","1");document.documentElement.dataset.intro="on"}}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${display.variable} ${sans.variable} ${script.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}