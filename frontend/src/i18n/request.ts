import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";

export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : DEFAULT_LOCALE;
  const [shop, admin] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/admin.${locale}.json`),
  ]);
  return { locale, messages: { ...shop.default, admin: admin.default } };
});