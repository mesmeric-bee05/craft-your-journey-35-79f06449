import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldAlert, ShieldX, Download, RefreshCw } from "lucide-react";
import { useSecurityFindings, type SecurityFinding } from "@/hooks/useSecurityFindings";
import { useCronHealth } from "@/hooks/useCronHealth";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";

const SEV_TONE: Record<string, string> = {
  error: "text-destructive",
  warn: "text-amber-500",
  info: "text-emerald-500",
};

function FindingRow({ f, onOpen }: { f: SecurityFinding; onOpen: (f: SecurityFinding) => void }) {
  const Icon = f.status === "fixed" ? ShieldCheck : f.status === "ignored" ? ShieldAlert : ShieldX;
  return (
    <button onClick={() => onOpen(f)} className="w-full text-left p-3 rounded-lg border bg-card/50 hover:bg-card flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${SEV_TONE[f.severity] ?? "text-muted-foreground"}`} />
        <div>
          <div className="font-medium text-sm">{f.name}</div>
          <div className="text-xs text-muted-foreground">{f.scanner_name} · {new Date(f.detected_at).toLocaleString()}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={f.severity === "error" ? "destructive" : "secondary"}>{f.severity}</Badge>
        <Badge variant={f.status === "open" ? "destructive" : f.status === "fixed" ? "default" : "outline"}>{f.status}</Badge>
      </div>
    </button>
  );
}

function FindingDrawer({ f, onClose, onSave }: { f: SecurityFinding | null; onClose: () => void; onSave: (id: string, status: SecurityFinding["status"], note: string) => void }) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<SecurityFinding["status"]>("open");
  useEffect(() => { if (f) { setNote(f.resolution_note ?? ""); setStatus(f.status); } }, [f]);
  return (
    <Sheet open={!!f} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto">
        {f && (
          <>
            <SheetHeader><SheetTitle>{f.name}</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-4 text-sm">
              <div className="text-muted-foreground">{f.description}</div>
              {f.remediation_link && (
                <a className="text-primary underline" href={f.remediation_link} target="_blank" rel="noopener noreferrer">Remediation guide ↗</a>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Scanner: <span className="text-foreground">{f.scanner_name}</span></div>
                <div>Severity: <span className="text-foreground">{f.severity}</span></div>
                <div>Detected: <span className="text-foreground">{new Date(f.detected_at).toLocaleString()}</span></div>
                {f.resolved_at && <div>Resolved: <span className="text-foreground">{new Date(f.resolved_at).toLocaleString()}</span></div>}
                {f.commit_sha && <div>Commit: <code className="text-foreground">{f.commit_sha.slice(0, 7)}</code></div>}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex gap-2">
                  {(["open", "fixed", "ignored"] as const).map((s) => (
                    <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s}</Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Note (fix description or ignore reason)</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
              </div>
              <Button onClick={() => onSave(f.id, status, note)}>Save</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function exportCsv(rows: SecurityFinding[]) {
  const header = ["scanner", "name", "severity", "status", "detected_at", "resolved_at", "note"];
  const csv = [header.join(",")].concat(
    rows.map((r) => [r.scanner_name, JSON.stringify(r.name), r.severity, r.status, r.detected_at, r.resolved_at ?? "", JSON.stringify(r.resolution_note ?? "")].join(",")),
  ).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `security-findings-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function SecurityFindings() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { findings, setStatus } = useSecurityFindings();
  const [selected, setSelected] = useState<SecurityFinding | null>(null);
  const [tab, setTab] = useState("open");

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user) return;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as any });
      if (!cancel) setIsAdmin(Boolean(data));
    })();
    return () => { cancel = true; };
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin === false) return <Navigate to="/dashboard" replace />;

  const all = findings.data ?? [];
  const counts = {
    open: all.filter((f) => f.status === "open").length,
    fixed: all.filter((f) => f.status === "fixed").length,
    ignored: all.filter((f) => f.status === "ignored").length,
  };
  const filtered = all.filter((f) => f.status === tab);

  return (
    <DashboardLayout>
      <RescanTile />
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Security Findings</h1>
            <p className="text-muted-foreground">Audit trail of every scanner finding, with applied fixes and ignore reasons.</p>
          </div>
          <Button variant="outline" onClick={() => exportCsv(all)}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(["open", "fixed", "ignored"] as const).map((s) => (
            <Card key={s}>
              <CardHeader className="pb-2"><CardTitle className="text-sm capitalize">{s}</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{counts[s]}</div></CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="open">Open ({counts.open})</TabsTrigger>
            <TabsTrigger value="fixed">Fixed ({counts.fixed})</TabsTrigger>
            <TabsTrigger value="ignored">Ignored ({counts.ignored})</TabsTrigger>
          </TabsList>
          {(["open", "fixed", "ignored"] as const).map((s) => (
            <TabsContent key={s} value={s} className="space-y-2 mt-4">
              {filtered.length === 0 && <div className="text-muted-foreground text-center py-10">Nothing here.</div>}
              {filtered.map((f) => <FindingRow key={f.id} f={f} onOpen={setSelected} />)}
            </TabsContent>
          ))}
        </Tabs>

        <FindingDrawer
          f={selected}
          onClose={() => setSelected(null)}
          onSave={(id, status, note) => {
            setStatus.mutate({ id, status, note }, { onSuccess: () => setSelected(null) });
          }}
        />
      </div>
    </DashboardLayout>
  );
}
