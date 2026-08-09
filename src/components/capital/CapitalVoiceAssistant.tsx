import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Mic, MicOff, Volume2, VolumeX, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCulture } from "@/lib/culture/CultureProvider";
import { toast } from "sonner";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

interface Turn {
  role: "user" | "assistant";
  text: string;
}

type VoiceIntent = "confirm_details" | "retry" | "documents" | "status";

interface Props {
  businessId: string | undefined;
  /** Opens the on-screen details review/confirm step. */
  onConfirmDetails?: () => void;
  /** Refreshes the owner's advance status. */
  onRetry?: () => void;
  /** Reveals the required-documents checklist. */
  onShowDocuments?: () => void;
}

export function CapitalVoiceAssistant({ businessId, onConfirmDetails, onRetry, onShowDocuments }: Props) {
  const { t, pref, speechLang } = useCulture();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [pendingIntent, setPendingIntent] = useState<Exclude<VoiceIntent, "status" | "documents"> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const supportsVoice = !!getRecognitionCtor();


  const speak = useCallback(
    (text: string) => {
      if (!speakEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = speechLang;
      utter.rate = 0.98;
      window.speechSynthesis.speak(utter);
    },
    [speakEnabled, speechLang],
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || !businessId) return;
      setDraft("");
      setTurns((prev) => [...prev, { role: "user", text: q }]);
      setThinking(true);
      try {
        const { data, error } = await supabase.functions.invoke("capital-voice", {
          body: { businessId, question: q, locale: pref.locale, tone: pref.tone },
        });
        if (error) {
          let detail = error.message;
          const ctx = (error as { context?: { text?: () => Promise<string> } }).context;
          if (ctx?.text) {
            try {
              const parsed = JSON.parse(await ctx.text());
              if (parsed?.error) detail = parsed.error;
            } catch { /* keep default */ }
          }
          throw new Error(detail);
        }
        const answer = (data as { answer?: string })?.answer ?? "";
        const intent = ((data as { intent?: VoiceIntent })?.intent ?? "status") as VoiceIntent;
        if (!answer) throw new Error("No answer returned");
        setTurns((prev) => [...prev, { role: "assistant", text: answer }]);
        speak(answer);

        // Voice never mutates on its own: read-only intents run immediately,
        // state-changing intents wait for an explicit on-screen confirmation.
        if (intent === "documents") onShowDocuments?.();
        else if (intent === "confirm_details" || intent === "retry") setPendingIntent(intent);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Voice assistant failed");
      } finally {
        setThinking(false);
      }
    },
    [businessId, pref.locale, pref.tone, speak, onShowDocuments],

  );

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.lang = speechLang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) void ask(transcript);
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") toast.error("Microphone access is needed to talk.");
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [ask, speechLang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="h-5 w-5" aria-hidden="true" />
            {t.voiceTitle}
          </CardTitle>
          <CardDescription>{t.voiceHint}</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={speakEnabled ? "Mute spoken answers" : "Unmute spoken answers"}
          onClick={() => {
            setSpeakEnabled((v) => !v);
            if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
          }}
        >
          {speakEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!businessId && <p className="text-sm text-muted-foreground">Select a business first.</p>}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={listening ? "destructive" : "default"}
            disabled={!supportsVoice || !businessId || thinking}
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={(e) => { e.preventDefault(); startListening(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
            className="gap-2"
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {listening ? t.voiceListening : t.voiceHold}
          </Button>
          {thinking && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t.voiceThinking}
            </Badge>
          )}
        </div>

        {!supportsVoice && <p className="text-xs text-muted-foreground">{t.voiceUnsupported}</p>}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(draft);
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.voiceTypeInstead}
            aria-label={t.voiceTypeInstead}
            maxLength={300}
          />
          <Button type="submit" disabled={!draft.trim() || thinking || !businessId} className="gap-2">
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t.voiceAsk}</span>
          </Button>
        </form>

        <div className="space-y-2 max-h-64 overflow-y-auto" aria-live="polite">
          {turns.length === 0 && <p className="text-sm text-muted-foreground">{t.voiceGreeting}</p>}
          {turns.map((turn, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 text-sm ${
                turn.role === "user" ? "bg-muted ml-6" : "bg-primary/10 mr-6"
              }`}
            >
              {turn.text}
            </div>
          ))}
        </div>

        <AlertDialog open={pendingIntent !== null} onOpenChange={(o) => !o && setPendingIntent(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.voiceConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingIntent === "retry" ? t.voiceConfirmRetry : t.voiceConfirmDetails}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.voiceCancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingIntent === "retry") onRetry?.();
                  else onConfirmDetails?.();
                  setPendingIntent(null);
                }}
              >
                {t.voiceConfirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>

  );
}
