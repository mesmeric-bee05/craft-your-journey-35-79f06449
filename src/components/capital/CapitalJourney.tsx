import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, FileText, Volume2, Compass } from "lucide-react";
import { useCulture } from "@/lib/culture/CultureProvider";

interface Props {
  /** 0 = eligibility, 1 = offer, 2 = sign & submit, 3 = funded */
  currentStage: number;
  onAction?: (stageIndex: number) => void;
}

export function CapitalJourney({ currentStage, onAction }: Props) {
  const { t, speechLang } = useCulture();
  const [open, setOpen] = useState(currentStage);

  const speakStage = (index: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const stage = t.journeyStages[index];
    const utter = new SpeechSynthesisUtterance(`${stage.title}. ${stage.body}`);
    utter.lang = speechLang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Compass className="h-5 w-5" aria-hidden="true" />
          {t.journeyTitle}
        </CardTitle>
        <CardDescription>{t.journeySubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="space-y-2">
          {t.journeyStages.map((stage, i) => {
            const done = i < currentStage;
            const active = i === currentStage;
            const expanded = open === i;
            return (
              <li key={stage.title} className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? -1 : i)}
                  aria-expanded={expanded}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden="true" />
                  ) : (
                    <Circle className={`h-5 w-5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                  )}
                  <span className="flex-1 text-sm font-medium">{stage.title}</span>
                  {active && <Badge variant="secondary">{t.nextAction}</Badge>}
                </button>
                {expanded && (
                  <div className="px-3 pb-3 pl-11 space-y-2">
                    <p className="text-sm text-muted-foreground">{stage.body}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant={active ? "default" : "outline"} onClick={() => onAction?.(i)}>
                        {stage.action}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => speakStage(i)} className="gap-1">
                        <Volume2 className="h-3 w-3" aria-hidden="true" />
                        Listen
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <div id="capital-required-docs" className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            {t.requiredDocs}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc pl-5">
            {t.docsList.map((doc) => (
              <li key={doc}>{doc}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
