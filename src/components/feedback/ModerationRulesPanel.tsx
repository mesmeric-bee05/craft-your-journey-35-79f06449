import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useModerationRules, previewModeration } from "@/hooks/useModerationRules";
import { ShieldCheck } from "lucide-react";

export function ModerationRulesPanel() {
  const { rules, upsert } = useModerationRules();
  const [form, setForm] = useState({
    is_active: true,
    spam_keywords: "" as string,
    block_languages: "" as string,
    min_message_length: 5,
    max_links: 2,
    auto_reject_below_score: "",
    auto_approve_above_score: "",
    severity_threshold: "medium",
  });
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (rules.data) {
      setForm({
        is_active: rules.data.is_active,
        spam_keywords: rules.data.spam_keywords.join(", "),
        block_languages: rules.data.block_languages.join(", "),
        min_message_length: rules.data.min_message_length,
        max_links: rules.data.max_links,
        auto_reject_below_score: rules.data.auto_reject_below_score?.toString() ?? "",
        auto_approve_above_score: rules.data.auto_approve_above_score?.toString() ?? "",
        severity_threshold: rules.data.severity_threshold,
      });
    }
  }, [rules.data]);

  if (rules.isLoading) return <Skeleton className="h-64 w-full" />;

  const previewResult = previewModeration(preview, rules.data ?? null);

  const save = () => {
    upsert.mutate({
      is_active: form.is_active,
      spam_keywords: form.spam_keywords.split(",").map((s) => s.trim()).filter(Boolean),
      block_languages: form.block_languages.split(",").map((s) => s.trim()).filter(Boolean),
      min_message_length: Number(form.min_message_length) || 5,
      max_links: Number(form.max_links) || 0,
      auto_reject_below_score: form.auto_reject_below_score ? Number(form.auto_reject_below_score) : null,
      auto_approve_above_score: form.auto_approve_above_score ? Number(form.auto_approve_above_score) : null,
      severity_threshold: form.severity_threshold,
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Moderation rules</CardTitle>
          <CardDescription>Auto-handle public submissions before they hit your queue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <div>
            <Label>Spam keywords (comma-separated)</Label>
            <Textarea rows={2} value={form.spam_keywords} onChange={(e) => setForm({ ...form, spam_keywords: e.target.value })} placeholder="loan, click here, bitcoin" />
          </div>
          <div>
            <Label>Blocked languages (codes)</Label>
            <Input value={form.block_languages} onChange={(e) => setForm({ ...form, block_languages: e.target.value })} placeholder="other, fr" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Min message length</Label>
              <Input type="number" min={1} value={form.min_message_length} onChange={(e) => setForm({ ...form, min_message_length: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Max links</Label>
              <Input type="number" min={0} value={form.max_links} onChange={(e) => setForm({ ...form, max_links: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Auto-reject below score</Label>
              <Input type="number" step="0.1" min={-1} max={1} value={form.auto_reject_below_score} onChange={(e) => setForm({ ...form, auto_reject_below_score: e.target.value })} placeholder="-0.7" />
            </div>
            <div>
              <Label>Auto-approve above score</Label>
              <Input type="number" step="0.1" min={-1} max={1} value={form.auto_approve_above_score} onChange={(e) => setForm({ ...form, auto_approve_above_score: e.target.value })} placeholder="0.5" />
            </div>
          </div>
          <div>
            <Label>Severity threshold</Label>
            <Input value={form.severity_threshold} onChange={(e) => setForm({ ...form, severity_threshold: e.target.value })} placeholder="low | medium | high" />
          </div>
          <Button onClick={save} disabled={upsert.isPending}>Save rules</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
          <CardDescription>Paste a sample message to see what would happen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={6} value={preview} onChange={(e) => setPreview(e.target.value)} placeholder="Type or paste a sample submission..." />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Result:</span>
            <Badge variant={previewResult.decision === "spam" ? "destructive" : "default"}>{previewResult.decision}</Badge>
            {previewResult.rule && <Badge variant="outline">{previewResult.rule}</Badge>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
