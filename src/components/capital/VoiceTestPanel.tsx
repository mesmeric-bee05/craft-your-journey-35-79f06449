import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { SPEECH_LANG, type CultureLocale } from "@/lib/culture/types";
import { VOICE_PHRASES, VOICE_TUNE, pickVoice } from "./CapitalVoiceGuide";

const LANGS: { id: CultureLocale; name: string }[] = [
  { id: "en", name: "English" },
  { id: "sw", name: "Kiswahili" },
  { id: "sheng", name: "Sheng'" },
  { id: "kenglish", name: "Kenglish" },
];
type Verdict = "clear" | "wrong_voice" | "silent" | "too_fast" | "too_slow";
const VERDICTS: { id: Verdict; label: string }[] = [
  { id: "clear", label: "Clear" },
  { id: "wrong_voice", label: "Wrong accent" },
  { id: "silent", label: "No sound" },
  { id: "too_fast", label: "Too fast" },
  { id: "too_slow", label: "Too slow" },
];
type Result = { verdict?: Verdict; note?: string; rate?: number };
const KEY = "capital_voice_test_results";

/** On-device test of the Capital voice guide in all four languages. Nothing leaves the phone. */
export function VoiceTestPanel() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [, setTick] = useState(0);
  const [playing, setPlaying] = useState<CultureLocale | null>(null);
  const [results, setResults] = useState<Record<string, Result>>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    if (!supported) return;
    const on = () => setTick((n) => n + 1);
    window.speechSynthesis.addEventListener("voiceschanged", on);
    on();
    return () => { window.speechSynthesis.removeEventListener("voiceschanged", on); window.speechSynthesis.cancel(); };
  }, [supported]);

  const save = (id: CultureLocale, patch: Result) => {
    const next = { ...results, [id]: { ...results[id], ...patch } };
    setResults(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const play = (id: CultureLocale) => {
    if (!supported) return;
    const lang = SPEECH_LANG[id];
    const voice = pickVoice(lang) ?? pickVoice("en-KE");
    if (!voice) { toast.error("This phone has no voice for this language — it shows as text."); return; }
    window.speechSynthesis.cancel();
    const tune = VOICE_TUNE[lang] ?? VOICE_TUNE["en-KE"];
    const rate = results[id]?.rate ?? tune.rate;
    const text = `${VOICE_PHRASES[id].steps[0]} ${VOICE_PHRASES[id].steps[4]}`;
    const chunks = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    setPlaying(id);
    chunks.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      u.voice = voice; u.lang = voice.lang; u.rate = rate; u.pitch = tune.pitch;
      if (i === chunks.length - 1) { u.onend = () => setPlaying(null); u.onerror = () => setPlaying(null); }
      window.speechSynthesis.speak(u);
    });
  };

  const copy = async () => {
    const lines = LANGS.map(({ id, name }) => {
      const r = results[id] ?? {};
      const v = supported ? pickVoice(SPEECH_LANG[id]) : undefined;
      const verdict = VERDICTS.find((x) => x.id === r.verdict)?.label ?? "not tested";
      return `${name}: ${verdict}; voice: ${v ? `${v.name} (${v.lang})` : "none (text only)"}; speed ${r.rate ?? "default"}${r.note ? `; note: ${r.note}` : ""}`;
    });
    await navigator.clipboard.writeText(`Voice test — ${navigator.userAgent}\n${lines.join("\n")}`);
    toast.success("Results copied — paste them into the chat.");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Voice test</CardTitle>
        <CardDescription>
          Play each language on this phone, pick how it sounded, then copy the results and send them to us. Results stay on this phone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supported && <p className="text-sm text-destructive">This browser can't speak. Try Chrome on Android or Safari on iPhone.</p>}
        {LANGS.map(({ id, name }) => {
          const lang = SPEECH_LANG[id];
          const native = supported ? pickVoice(lang) : undefined;
          const fallback = !native && supported ? pickVoice("en-KE") : undefined;
          const r = results[id] ?? {};
          const rate = r.rate ?? (VOICE_TUNE[lang] ?? VOICE_TUNE["en-KE"]).rate;
          return (
            <div key={id} className="space-y-2 rounded-md border border-border/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{name}</p>
                <Badge variant={native ? "default" : fallback ? "secondary" : "destructive"}>
                  {native ? `Voice: ${native.name}` : fallback ? `English voice: ${fallback.name}` : "Text only"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{VOICE_PHRASES[id].steps[0]}</p>
              <div className="flex items-center gap-2">
                {playing === id ? (
                  <Button size="sm" variant="outline" onClick={() => { window.speechSynthesis.cancel(); setPlaying(null); }}>
                    <Square className="mr-1 h-4 w-4" />Stop
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => play(id)} disabled={!supported}>
                    <Play className="mr-1 h-4 w-4" />Play {name}
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">Speed {rate.toFixed(2)}</span>
              </div>
              <Slider min={0.7} max={1.2} step={0.05} value={[rate]} onValueChange={([v]) => save(id, { rate: v })} aria-label={`${name} speed`} />
              <div className="flex flex-wrap gap-1.5">
                {VERDICTS.map((v) => (
                  <Button key={v.id} size="sm" variant={r.verdict === v.id ? "default" : "outline"} onClick={() => save(id, { verdict: v.id })}>
                    {v.label}
                  </Button>
                ))}
              </div>
              <Textarea rows={2} maxLength={300} placeholder="Words that sounded wrong (optional)" value={r.note ?? ""} onChange={(e) => save(id, { note: e.target.value })} aria-label={`${name} notes`} />
            </div>
          );
        })}
        <Button variant="secondary" onClick={copy}><Copy className="mr-2 h-4 w-4" />Copy my results</Button>
      </CardContent>
    </Card>
  );
}
