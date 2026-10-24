import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import AdminProviders from "@/components/admin/AdminProviders";

const soft = Nunito({
  subsets: ["latin", "latin-ext"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Studio | Lunelle", template: "%s | Lunelle Studio" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <div className={`${soft.variable} admin-root`}>
      <NextIntlClientProvider locale={locale} messages={{ admin: messages.admin }}>
        <AdminProviders>{children}</AdminProviders>
      </NextIntlClientProvider>
    </div>
  );
}