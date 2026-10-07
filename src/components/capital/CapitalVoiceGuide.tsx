import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw, Volume2, Square } from "lucide-react";
import { useCulture } from "@/lib/culture/CultureProvider";
import { LanguageToneSwitcher } from "@/components/culture/LanguageToneSwitcher";
import type { CultureLocale } from "@/lib/culture/types";
import type { MyAdvanceStatus } from "@/hooks/useCapital";

const kes = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;
const when = (iso: string | null | undefined, locale: CultureLocale) =>
  iso ? new Date(iso).toLocaleString(locale === "sw" || locale === "sheng" ? "sw-KE" : "en-KE", { dateStyle: "medium", timeStyle: "short" }) : null;

type Phrases = {
  title: string; desc: string; guide: string; summary: string; stop: string;
  next: string; back: string; repeat: string; step: (i: number, n: number) => string;
  steps: string[];
  noAdvance: string;
  advance: (p: string, bal: string, pct: number) => string;
  repaid: (t: string) => string;
  last: (a: string, s: string, d: string) => string;
  noRepay: string;
  cron: (ok: boolean, d: string) => string;
  noCron: string;
};

const P: Record<CultureLocale, Phrases> = {
  en: {
    title: "Voice guide", desc: "Hear each application step and your repayment summary read aloud.",
    guide: "Guide me by voice", summary: "Read my repayment summary", stop: "Stop",
    next: "Next", back: "Back", repeat: "Repeat", step: (i, n) => `Step ${i} of ${n}`,
    steps: [
      "Choose your amount. Pick how much you need, up to your SmartReach offer limit.",
      "Choose your revenue share. This is the percentage of daily sales that goes to repayment.",
      "Prepare your documents: business registration, three months of M-Pesa or bank statements, your national ID and KRA PIN.",
      "Review your details. Check the amount, the revenue share and the total you will repay.",
      "Submit. Type your full name as your signature, accept the terms, and tap Submit on screen. Nothing is sent until you tap.",
    ],
    noAdvance: "You don't have an active advance yet.",
    advance: (p, b, pct) => `Your advance is ${p}. You still owe ${b}, repaid at ${pct} percent of daily sales.`,
    repaid: (t) => `So far you have repaid ${t}.`,
    last: (a, s, d) => `Your last repayment was ${a}, status ${s}, on ${d}.`,
    noRepay: "No repayments have been recorded yet.",
    cron: (ok, d) => ok ? `The nightly collection last ran successfully on ${d}.` : `The nightly collection failed on ${d}. Our team has been alerted.`,
    noCron: "The nightly collection has not run yet.",
  },
  sw: {
    title: "Mwongozo wa sauti", desc: "Sikiliza kila hatua ya maombi na muhtasari wa marejesho yako.",
    guide: "Niongoze kwa sauti", summary: "Nisomee muhtasari wa marejesho", stop: "Simamisha",
    next: "Endelea", back: "Rudi", repeat: "Rudia", step: (i, n) => `Hatua ${i} kati ya ${n}`,
    steps: [
      "Chagua kiasi. Chagua kiasi unachohitaji, hadi kikomo cha ofa yako ya SmartReach.",
      "Chagua asilimia ya mapato. Hii ni sehemu ya mauzo ya kila siku itakayolipa mkopo.",
      "Andaa nyaraka: cheti cha usajili wa biashara, taarifa za M-Pesa au benki za miezi mitatu, kitambulisho cha taifa na PIN ya KRA.",
      "Hakiki maelezo. Angalia kiasi, asilimia ya mapato na jumla utakayorejesha.",
      "Wasilisha. Andika jina lako kamili kama sahihi, kubali masharti, kisha bonyeza Wasilisha kwenye skrini. Hakuna kinachotumwa hadi ubonyeze.",
    ],
    noAdvance: "Bado huna mkopo unaoendelea.",
    advance: (p, b, pct) => `Mkopo wako ni ${p}. Bado unadaiwa ${b}, unaolipwa kwa asilimia ${pct} ya mauzo ya kila siku.`,
    repaid: (t) => `Hadi sasa umerejesha ${t}.`,
    last: (a, s, d) => `Rejesho lako la mwisho lilikuwa ${a}, hali ${s}, tarehe ${d}.`,
    noRepay: "Bado hakuna marejesho yaliyorekodiwa.",
    cron: (ok, d) => ok ? `Ukusanyaji wa usiku ulifanikiwa mara ya mwisho tarehe ${d}.` : `Ukusanyaji wa usiku ulishindwa tarehe ${d}. Timu yetu imearifiwa.`,
    noCron: "Ukusanyaji wa usiku bado haujafanyika.",
  },
  sheng: {
    title: "Voice guide", desc: "Skiza kila step ya application na summary ya repayment zako.",
    guide: "Niguide kwa voice", summary: "Nisomee repayment zangu", stop: "Wacha",
    next: "Next", back: "Rudi", repeat: "Rudia", step: (i, n) => `Step ${i} kati ya ${n}`,
    steps: [
      "Chagua doh unataka. Weka amount unahitaji, hadi limit ya offer yako ya SmartReach.",
      "Chagua revenue share. Hii ni percent ya sales za kila siku itakayolipa advance.",
      "Panga documents: registration ya biashara, statements za M-Pesa ama bank za miezi tatu, ID na KRA PIN.",
      "Check details. Angalia amount, revenue share na total utalipa.",
      "Submit. Andika jina yako yote kama sign, kubali terms, alafu bonyeza Submit kwa screen. Hakuna kitu inatumwa mpaka ubonyeze.",
    ],
    noAdvance: "Bado huna advance iko on.",
    advance: (p, b, pct) => `Advance yako ni ${p}. Bado uko na deni ya ${b}, inalipwa ${pct} percent ya sales za kila siku.`,
    repaid: (t) => `Mpaka sasa umelipa ${t}.`,
    last: (a, s, d) => `Repayment ya mwisho ilikuwa ${a}, status ${s}, ${d}.`,
    noRepay: "Bado hakuna repayment imerekodiwa.",
    cron: (ok, d) => ok ? `Collection ya usiku iliwork poa mara ya mwisho ${d}.` : `Collection ya usiku ilifail ${d}. Team yetu imeambiwa.`,
    noCron: "Collection ya usiku bado haija-run.",
  },
  kenglish: {
    title: "Voice guide", desc: "Hear kila step ya application and your repayment summary.",
    guide: "Guide me by voice", summary: "Read my repayment summary", stop: "Stop",
    next: "Next", back: "Back", repeat: "Rudia", step: (i, n) => `Step ${i} of ${n}`,
    steps: [
      "Choose your amount. Pick kiasi unahitaji, up to your SmartReach offer limit.",
      "Choose revenue share. Hii ni percentage ya daily sales that goes to repayment.",
      "Prepare documents: business registration, three months za M-Pesa or bank statements, ID yako na KRA PIN.",
      "Review details. Confirm amount, revenue share na total utarepay.",
      "Submit. Type your full name as signature, accept terms, then tap Submit on screen. Hakuna kitu inatumwa until you tap.",
    ],
    noAdvance: "You don't have an active advance bado.",
    advance: (p, b, pct) => `Your advance ni ${p}. Balance iko ${b}, repaid at ${pct} percent ya daily sales.`,
    repaid: (t) => `So far umerepay ${t}.`,
    last: (a, s, d) => `Last repayment ilikuwa ${a}, status ${s}, on ${d}.`,
    noRepay: "No repayments zimerekodiwa bado.",
    cron: (ok, d) => ok ? `Nightly collection ili-run successfully on ${d}.` : `Nightly collection ilifail on ${d}. Team yetu imealertiwa.`,
    noCron: "Nightly collection haija-run bado.",
  },
};

/** Builds the spoken repayment summary from real figures only. */
export function buildRepaymentSummary(s: MyAdvanceStatus | null | undefined, locale: CultureLocale): string {
  const p = P[locale];
  const a = s?.advance;
  if (!a) return p.noAdvance;
  const parts = [
    p.advance(kes(a.principal_kes), kes(Math.max(0, a.total_owed_kes - a.amount_repaid_kes)), a.revenue_share_pct),
    p.repaid(kes(a.amount_repaid_kes)),
  ];
  const last = [...(s?.repayments ?? [])].sort((x, y) =>
    (y.collected_at ?? y.scheduled_for ?? "").localeCompare(x.collected_at ?? x.scheduled_for ?? ""))[0];
  parts.push(last ? p.last(kes(last.amount_kes), last.status, when(last.collected_at ?? last.scheduled_for, locale) ?? "—") : p.noRepay);
  const cron = s?.last_repayment_cron;
  parts.push(cron ? p.cron(cron.status === "success", when(cron.finished_at ?? cron.started_at, locale) ?? "—") : p.noCron);
  return parts.join(" ");
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split("-")[0];
  return voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(base)) ?? voices.find((v) => v.lang.startsWith("en"));
}

export function CapitalVoiceGuide({ status }: { status: MyAdvanceStatus | null | undefined }) {
  const { pref, speechLang } = useCulture();
  const p = P[pref.locale];
  const [step, setStep] = useState<number | null>(null);
  const [text, setText] = useState("");
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = (t: string) => {
    setText(t);
    if (!supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = speechLang;
    const v = pickVoice(speechLang);
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };

  // Re-read the current step in the new language; the step index is kept.
  useEffect(() => {
    if (step !== null) speak(p.steps[step]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pref.locale]);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  const summary = useMemo(() => buildRepaymentSummary(status, pref.locale), [status, pref.locale]);
  const go = (i: number) => { setStep(i); speak(p.steps[i]); };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Volume2 className="h-5 w-5" />{p.title}</CardTitle>
        <CardDescription>{p.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LanguageToneSwitcher />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => go(0)}>{p.guide}</Button>
          <Button variant="secondary" onClick={() => { setStep(null); speak(summary); }}>{p.summary}</Button>
          {supported && (
            <Button variant="ghost" onClick={() => window.speechSynthesis.cancel()}>
              <Square className="mr-2 h-4 w-4" />{p.stop}
            </Button>
          )}
        </div>
        {step !== null && (
          <div className="space-y-3 rounded-md border p-3" aria-live="polite">
            <p className="text-xs text-muted-foreground">{p.step(step + 1, p.steps.length)}</p>
            <p className="text-sm">{p.steps[step]}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={step === 0} onClick={() => go(step - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />{p.back}
              </Button>
              <Button size="sm" variant="outline" onClick={() => speak(p.steps[step])}>
                <RotateCcw className="mr-1 h-4 w-4" />{p.repeat}
              </Button>
              <Button size="sm" disabled={step === p.steps.length - 1} onClick={() => go(step + 1)}>
                {p.next}<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {step === null && text && <p className="rounded-md border p-3 text-sm" aria-live="polite">{text}</p>}
      </CardContent>
    </Card>
  );
}
