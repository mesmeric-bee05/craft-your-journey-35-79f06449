import type { CulturePreference } from "./types";

const REGISTER: Record<string, string> = {
  en: "Professional Kenyan English. Clear, direct, no slang.",
  sw: "Kiswahili sanifu (standard, professional Swahili) as used in Kenyan business communication.",
  sheng: "Nairobi Sheng' — casual street register mixing Swahili and English (e.g. 'doh' for money, 'sasa' as greeting). Warm and informal, never disrespectful.",
  kenglish:
    "Kenglish — natural English/Kiswahili code-switching the way Nairobi SME owners actually speak (e.g. 'Funds zinaingia M-Pesa yako').",
};

/** Shared system-prompt fragment so every AI surface speaks in the user's chosen register. */
export function buildCulturePrompt(pref: CulturePreference): string {
  const tone =
    pref.tone === "casual"
      ? "Tone: friendly and relaxed, like a trusted business friend. Short sentences."
      : "Tone: respectful and professional, like a good relationship manager.";
  return [
    `Language and register: ${REGISTER[pref.locale] ?? REGISTER.en}`,
    tone,
    "Audience: Kenyan MSME owners. Use KES for money, Kenyan date formats, and local context (M-Pesa, till, paybill, chama, SACCO).",
    "Never invent numbers — only state figures that appear in the provided data.",
  ].join("\n");
}
