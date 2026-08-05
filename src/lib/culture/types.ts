export type CultureLocale = "en" | "sw" | "sheng" | "kenglish";
export type CultureTone = "formal" | "casual";

export interface CulturePreference {
  locale: CultureLocale;
  tone: CultureTone;
}

export const DEFAULT_CULTURE: CulturePreference = { locale: "en", tone: "formal" };

export const LOCALE_LABELS: Record<CultureLocale, string> = {
  en: "English",
  sw: "Kiswahili",
  sheng: "Sheng'",
  kenglish: "Kenglish (mix)",
};

export const LOCALE_DESCRIPTIONS: Record<CultureLocale, string> = {
  en: "Professional English",
  sw: "Kiswahili sanifu — professional",
  sheng: "Nairobi Sheng' — casual street register",
  kenglish: "English + Kiswahili code-switch",
};

export const TONE_LABELS: Record<CultureTone, string> = {
  formal: "Formal",
  casual: "Casual",
};

/** BCP-47 tag used for speech synthesis / recognition hints. */
export const SPEECH_LANG: Record<CultureLocale, string> = {
  en: "en-KE",
  sw: "sw-KE",
  sheng: "sw-KE",
  kenglish: "en-KE",
};
