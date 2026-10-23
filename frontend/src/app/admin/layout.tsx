import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import AdminProviders from "@/components/admin/AdminProviders";

export const metadata: Metadata = {
  title: { default: "Studio | Lunelle", template: "%s | Lunelle Studio" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <NextIntlClientProvider locale={locale} messages={{ admin: messages.admin }}>
      <AdminProviders>{children}</AdminProviders>
    </NextIntlClientProvider>
  );
}