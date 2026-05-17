/**
 * lib/languages.ts
 *
 * Single source of truth for the languages supported by the application.
 * The admin UI populates its "Add Language" dropdown from this list, and
 * runtime helpers (selector, fallback logic) derive their types from it.
 *
 * Adding an entry here does not create the corresponding database column —
 * a Prisma migration is still required. See docs/add-language.md.
 */

export type Language = {
  /** ISO 639-1 two-letter code (e.g. "fr", "de", "zh"). */
  readonly code: string;
  /** English name, used as the searchable label in the admin dropdown. */
  readonly name: string;
  /** Native name, displayed alongside the flag in the UI. */
  readonly nativeName: string;
  /** Unicode flag emoji representing the language. */
  readonly flag: string;
};

/**
 * The 57 most common ISO 639-1 languages.
 *
 * Order matters: the dropdown renders entries in this order. Every entry has
 * a corresponding `text<Code>` column in the Rectangle model.
 */
export const SUPPORTED_LANGUAGES = [
  { code: "fr", name: "French",       nativeName: "Français",         flag: "🇫🇷" },
  { code: "en", name: "English",      nativeName: "English",          flag: "🇬🇧" },
  { code: "nl", name: "Dutch",        nativeName: "Nederlands",       flag: "🇳🇱" },
  { code: "de", name: "German",       nativeName: "Deutsch",          flag: "🇩🇪" },
  { code: "es", name: "Spanish",      nativeName: "Español",          flag: "🇪🇸" },
  { code: "it", name: "Italian",      nativeName: "Italiano",         flag: "🇮🇹" },
  { code: "pt", name: "Portuguese",   nativeName: "Português",        flag: "🇵🇹" },
  { code: "ru", name: "Russian",      nativeName: "Русский",          flag: "🇷🇺" },
  { code: "uk", name: "Ukrainian",    nativeName: "Українська",       flag: "🇺🇦" },
  { code: "pl", name: "Polish",       nativeName: "Polski",           flag: "🇵🇱" },
  { code: "cs", name: "Czech",        nativeName: "Čeština",          flag: "🇨🇿" },
  { code: "sk", name: "Slovak",       nativeName: "Slovenčina",       flag: "🇸🇰" },
  { code: "hu", name: "Hungarian",    nativeName: "Magyar",           flag: "🇭🇺" },
  { code: "ro", name: "Romanian",     nativeName: "Română",           flag: "🇷🇴" },
  { code: "bg", name: "Bulgarian",    nativeName: "Български",        flag: "🇧🇬" },
  { code: "el", name: "Greek",        nativeName: "Ελληνικά",         flag: "🇬🇷" },
  { code: "sv", name: "Swedish",      nativeName: "Svenska",          flag: "🇸🇪" },
  { code: "no", name: "Norwegian",    nativeName: "Norsk",            flag: "🇳🇴" },
  { code: "da", name: "Danish",       nativeName: "Dansk",            flag: "🇩🇰" },
  { code: "fi", name: "Finnish",      nativeName: "Suomi",            flag: "🇫🇮" },
  { code: "is", name: "Icelandic",    nativeName: "Íslenska",         flag: "🇮🇸" },
  { code: "et", name: "Estonian",     nativeName: "Eesti",            flag: "🇪🇪" },
  { code: "lv", name: "Latvian",      nativeName: "Latviešu",         flag: "🇱🇻" },
  { code: "lt", name: "Lithuanian",   nativeName: "Lietuvių",         flag: "🇱🇹" },
  { code: "hr", name: "Croatian",     nativeName: "Hrvatski",         flag: "🇭🇷" },
  { code: "sr", name: "Serbian",      nativeName: "Српски",           flag: "🇷🇸" },
  { code: "sl", name: "Slovenian",    nativeName: "Slovenščina",      flag: "🇸🇮" },
  { code: "mk", name: "Macedonian",   nativeName: "Македонски",       flag: "🇲🇰" },
  { code: "sq", name: "Albanian",     nativeName: "Shqip",            flag: "🇦🇱" },
  { code: "tr", name: "Turkish",      nativeName: "Türkçe",           flag: "🇹🇷" },
  { code: "he", name: "Hebrew",       nativeName: "עברית",            flag: "🇮🇱" },
  { code: "ar", name: "Arabic",       nativeName: "العربية",          flag: "🇸🇦" },
  { code: "fa", name: "Persian",      nativeName: "فارسی",            flag: "🇮🇷" },
  { code: "ur", name: "Urdu",         nativeName: "اردو",             flag: "🇵🇰" },
  { code: "hi", name: "Hindi",        nativeName: "हिन्दी",            flag: "🇮🇳" },
  { code: "bn", name: "Bengali",      nativeName: "বাংলা",             flag: "🇧🇩" },
  { code: "ta", name: "Tamil",        nativeName: "தமிழ்",             flag: "🇮🇳" },
  { code: "te", name: "Telugu",       nativeName: "తెలుగు",            flag: "🇮🇳" },
  { code: "mr", name: "Marathi",      nativeName: "मराठी",             flag: "🇮🇳" },
  { code: "gu", name: "Gujarati",     nativeName: "ગુજરાતી",          flag: "🇮🇳" },
  { code: "pa", name: "Punjabi",      nativeName: "ਪੰਜਾਬੀ",            flag: "🇮🇳" },
  { code: "zh", name: "Chinese",      nativeName: "中文",              flag: "🇨🇳" },
  { code: "ja", name: "Japanese",     nativeName: "日本語",             flag: "🇯🇵" },
  { code: "ko", name: "Korean",       nativeName: "한국어",             flag: "🇰🇷" },
  { code: "vi", name: "Vietnamese",   nativeName: "Tiếng Việt",       flag: "🇻🇳" },
  { code: "th", name: "Thai",         nativeName: "ไทย",               flag: "🇹🇭" },
  { code: "id", name: "Indonesian",   nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Malay",        nativeName: "Bahasa Melayu",    flag: "🇲🇾" },
  { code: "tl", name: "Tagalog",      nativeName: "Tagalog",          flag: "🇵🇭" },
  { code: "sw", name: "Swahili",      nativeName: "Kiswahili",        flag: "🇰🇪" },
  { code: "am", name: "Amharic",      nativeName: "አማርኛ",              flag: "🇪🇹" },
  { code: "af", name: "Afrikaans",    nativeName: "Afrikaans",        flag: "🇿🇦" },
  { code: "zu", name: "Zulu",         nativeName: "isiZulu",          flag: "🇿🇦" },
  { code: "ka", name: "Georgian",     nativeName: "ქართული",          flag: "🇬🇪" },
  { code: "hy", name: "Armenian",     nativeName: "Հայերեն",          flag: "🇦🇲" },
  { code: "az", name: "Azerbaijani",  nativeName: "Azərbaycan",       flag: "🇦🇿" },
  { code: "kk", name: "Kazakh",       nativeName: "Қазақша",          flag: "🇰🇿" },
] as const satisfies readonly Language[];

/** Union of every supported language code, inferred from SUPPORTED_LANGUAGES. */
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** Lookup helper for a single language by its ISO code. */
export function getLanguage(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

/** Type guard: narrows an unknown string to a valid LanguageCode. */
export function isSupportedLanguage(code: string): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
}

/**
 * Returns the entries that are NOT yet active.
 * Used by the admin "Add Language" modal to grey out already-active rows.
 */
export function getInactiveLanguages(
  activeCodes: readonly string[],
): readonly Language[] {
  const active = new Set(activeCodes);
  return SUPPORTED_LANGUAGES.filter((lang) => !active.has(lang.code));
}
