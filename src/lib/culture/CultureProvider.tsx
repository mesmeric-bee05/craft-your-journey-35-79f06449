import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DICTIONARY, type CultureStrings } from "./dictionary";
import { DEFAULT_CULTURE, SPEECH_LANG, type CulturePreference, type CultureLocale, type CultureTone } from "./types";
import { buildCulturePrompt } from "./prompt";

const STORAGE_KEY = "smartreach.culture";

interface CultureContextValue {
  pref: CulturePreference;
  t: CultureStrings;
  speechLang: string;
  culturePrompt: string;
  setLocale: (l: CultureLocale) => void;
  setTone: (tn: CultureTone) => void;
}

const CultureContext = createContext<CultureContextValue | null>(null);

function readLocal(): CulturePreference {
  if (typeof window === "undefined") return DEFAULT_CULTURE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CULTURE;
    const parsed = JSON.parse(raw) as Partial<CulturePreference>;
    return {
      locale: (parsed.locale && parsed.locale in DICTIONARY ? parsed.locale : DEFAULT_CULTURE.locale) as CultureLocale,
      tone: parsed.tone === "casual" ? "casual" : "formal",
    };
  } catch {
    return DEFAULT_CULTURE;
  }
}

export function CultureProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [pref, setPref] = useState<CulturePreference>(readLocal);

  // Hydrate from the user's saved preference once signed in.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      const saved = (data?.preferences as Record<string, unknown> | null)?.culture as
        | Partial<CulturePreference>
        | undefined;
      if (cancelled || !saved?.locale) return;
      const next: CulturePreference = {
        locale: (saved.locale in DICTIONARY ? saved.locale : DEFAULT_CULTURE.locale) as CultureLocale,
        tone: saved.tone === "casual" ? "casual" : "formal",
      };
      setPref(next);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const persist = useCallback(
    async (next: CulturePreference) => {
      setPref(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* storage disabled */ }
      if (!user?.id) return;
      const { data } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      const prefs = {
        ...((data?.preferences as Record<string, unknown>) ?? {}),
        culture: { locale: next.locale, tone: next.tone },
      } as never;
      await supabase
        .from("user_settings")
        .upsert([{ user_id: user.id, preferences: prefs }], { onConflict: "user_id" });
    },
    [user?.id],
  );

  const value = useMemo<CultureContextValue>(
    () => ({
      pref,
      t: DICTIONARY[pref.locale] ?? DICTIONARY.en,
      speechLang: SPEECH_LANG[pref.locale] ?? "en-KE",
      culturePrompt: buildCulturePrompt(pref),
      setLocale: (locale) => void persist({ ...pref, locale }),
      setTone: (tone) => void persist({ ...pref, tone }),
    }),
    [pref, persist],
  );

  return <CultureContext.Provider value={value}>{children}</CultureContext.Provider>;
}

export function useCulture(): CultureContextValue {
  const ctx = useContext(CultureContext);
  if (!ctx) {
    // Safe fallback so components render even outside the provider.
    return {
      pref: DEFAULT_CULTURE,
      t: DICTIONARY.en,
      speechLang: "en-KE",
      culturePrompt: buildCulturePrompt(DEFAULT_CULTURE),
      setLocale: () => {},
      setTone: () => {},
    };
  }
  return ctx;
}
