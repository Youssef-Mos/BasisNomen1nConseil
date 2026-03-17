import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const activeLocale = hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale;

  return {
    locale: activeLocale,
    messages: (await import(`../messages/${activeLocale}.json`)).default,
  };
});
