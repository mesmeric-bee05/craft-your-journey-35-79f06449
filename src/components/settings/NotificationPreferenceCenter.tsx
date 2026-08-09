import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCulture } from "@/lib/culture/CultureProvider";
import { LanguageToneSwitcher } from "@/components/culture/LanguageToneSwitcher";
import { toast } from "sonner";

type Frequency = "immediate" | "hourly" | "daily" | "off";

interface OpsAlertPrefs {
  email: boolean;
  slack: boolean;
  in_app: boolean;
  frequency: Frequency;
}

const DEFAULTS: OpsAlertPrefs = { email: true, slack: false, in_app: true, frequency: "immediate" };

export function NotificationPreferenceCenter() {
  const { user } = useAuth();
  const { t } = useCulture();
  const [prefs, setPrefs] = useState<OpsAlertPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const saved = (data?.preferences as Record<string, unknown> | null)?.ops_alerts as
        | Partial<OpsAlertPrefs>
        | undefined;
      if (saved) setPrefs({ ...DEFAULTS, ...saved });
      const { data: last } = await supabase
        .from("notifications")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("type", "status_change")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setLastAlert(last?.created_at ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { data } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      const merged = {
        ...((data?.preferences as Record<string, unknown>) ?? {}),
        ops_alerts: { ...prefs },
      } as never;
      const { error } = await supabase
        .from("user_settings")
        .upsert([{ user_id: user.id, preferences: merged }], { onConflict: "user_id" });
      if (error) throw error;
      toast.success(t.saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" aria-hidden="true" />
            {t.notifTitle}
          </CardTitle>
          <CardDescription>{t.notifSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {([
              ["email", t.channelEmail, "Disbursement, repayment and sync alerts by email."],
              ["slack", t.channelSlack, "Posted to your team's connected Slack alerts channel."],
              ["in_app", t.channelInApp, "Shown in the notification bell inside SmartReach."],
            ] as const).map(([key, label, hint]) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor={`ch-${key}`}>{label}</Label>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <Switch
                  id={`ch-${key}`}
                  checked={prefs[key]}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label>Alert frequency</Label>
            <RadioGroup
              value={prefs.frequency}
              onValueChange={(v) => setPrefs((p) => ({ ...p, frequency: v as Frequency }))}
              className="grid sm:grid-cols-2 gap-2"
            >
              {([
                ["immediate", t.freqImmediate],
                ["hourly", t.freqHourly],
                ["daily", t.freqDaily],
                ["off", t.freqOff],
              ] as const).map(([value, label]) => (
                <div key={value} className="flex items-center gap-2 rounded-lg border p-3">
                  <RadioGroupItem value={value} id={`freq-${value}`} />
                  <Label htmlFor={`freq-${value}`} className="font-normal cursor-pointer">{label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <p className="text-xs text-muted-foreground">
            Last alert delivered to you:{" "}
            {lastAlert ? new Date(lastAlert).toLocaleString() : "none yet"}
          </p>

          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save preferences
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.language} &amp; {t.tone}</CardTitle>
          <CardDescription>
            Choose the language and register SmartReach uses across Capital, AI replies and the voice assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageToneSwitcher compact />
        </CardContent>
      </Card>
    </div>
  );
}
