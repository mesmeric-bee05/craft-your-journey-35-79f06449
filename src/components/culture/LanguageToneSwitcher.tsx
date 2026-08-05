import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCulture } from "@/lib/culture/CultureProvider";
import { LOCALE_DESCRIPTIONS, LOCALE_LABELS, TONE_LABELS, type CultureLocale, type CultureTone } from "@/lib/culture/types";

export function LanguageToneSwitcher({ compact = false }: { compact?: boolean }) {
  const { pref, t, setLocale, setTone } = useCulture();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!compact && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Globe className="h-3 w-3" aria-hidden="true" />
          {t.language}
        </span>
      )}
      <Select value={pref.locale} onValueChange={(v) => setLocale(v as CultureLocale)}>
        <SelectTrigger className="w-[170px] h-9" aria-label={t.language}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(LOCALE_LABELS) as CultureLocale[]).map((l) => (
            <SelectItem key={l} value={l}>
              <span className="flex flex-col">
                <span>{LOCALE_LABELS[l]}</span>
                <span className="text-xs text-muted-foreground">{LOCALE_DESCRIPTIONS[l]}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={pref.tone} onValueChange={(v) => setTone(v as CultureTone)}>
        <SelectTrigger className="w-[120px] h-9" aria-label={t.tone}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(TONE_LABELS) as CultureTone[]).map((tn) => (
            <SelectItem key={tn} value={tn}>{TONE_LABELS[tn]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
