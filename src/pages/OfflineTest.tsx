import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wifi, WifiOff, Send, Trash2, RefreshCw } from "lucide-react";
import {
  enqueue, clearOutbox, flushOutbox, registerOutboxHandler, unregisterOutboxHandler,
  setSimulatedOffline, isSimulatedOffline, useOnlineStatus, useOutboxItems, useFlushProgress,
  type OutboxItem,
} from "@/pwa/outbox";

// Track transient handler attempts across replays
const transientAttempts = new Map<string, number>();

export default function OfflineTest() {
  const online = useOnlineStatus();
  const items = useOutboxItems();
  const progress = useFlushProgress();
  const [simOffline, setSimOffline] = useState(isSimulatedOffline());

  useEffect(() => {
    registerOutboxHandler("test.success", async () => { await new Promise((r) => setTimeout(r, 300)); });
    registerOutboxHandler("test.transient", async (item: OutboxItem) => {
      const n = (transientAttempts.get(item.id) ?? 0) + 1;
      transientAttempts.set(item.id, n);
      await new Promise((r) => setTimeout(r, 300));
      if (n < 3) throw new Error(`Transient failure (attempt ${n}/3)`);
      transientAttempts.delete(item.id);
    });
    registerOutboxHandler("test.permanent", async () => {
      await new Promise((r) => setTimeout(r, 200));
      throw new Error("Permanent failure — endpoint rejected the payload");
    });
    return () => {
      unregisterOutboxHandler("test.success");
      unregisterOutboxHandler("test.transient");
      unregisterOutboxHandler("test.permanent");
    };
  }, []);

  const toggleOffline = (v: boolean) => { setSimOffline(v); setSimulatedOffline(v); };

  const pct = progress.total > 0
    ? Math.round(((progress.processed + progress.failed) / progress.total) * 100)
    : 0;

  return (
    <DashboardLayout>
      <Helmet><title>Offline Test Mode — SmartReach</title></Helmet>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offline Outbox Test Mode</h1>
          <p className="text-muted-foreground mt-1">
            Enqueue synthetic actions, simulate offline, and watch the IndexedDB outbox replay when connectivity returns.
          </p>
        </div>

        <Card className="p-4 flex items-center gap-4 flex-wrap">
          <Badge variant={online ? "default" : "destructive"} className="gap-1">
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {online ? "Online" : "Offline"}
          </Badge>
          <div className="flex items-center gap-2">
            <Switch id="sim" checked={simOffline} onCheckedChange={toggleOffline} />
            <Label htmlFor="sim">Simulate offline</Label>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => flushOutbox()} disabled={progress.running}>
              <RefreshCw className={`h-4 w-4 mr-1 ${progress.running ? "animate-spin" : ""}`} /> Force flush
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearOutbox()}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear queue
            </Button>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="text-sm font-medium">Enqueue synthetic action</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => enqueue({ kind: "test.success", payload: { at: Date.now() } })}>
              <Send className="h-4 w-4 mr-1" /> Success (always OK)
            </Button>
            <Button size="sm" variant="secondary" onClick={() => enqueue({ kind: "test.transient", payload: { at: Date.now() } })}>
              <Send className="h-4 w-4 mr-1" /> Transient (fails 2, then OK)
            </Button>
            <Button size="sm" variant="destructive" onClick={() => enqueue({ kind: "test.permanent", payload: { at: Date.now() } })}>
              <Send className="h-4 w-4 mr-1" /> Permanent failure
            </Button>
          </div>
        </Card>

        {progress.total > 0 && (
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Flush progress</span>
              <span className="text-muted-foreground">
                {progress.processed} processed · {progress.failed} failed · {progress.total} total
              </span>
            </div>
            <Progress value={pct} />
          </Card>
        )}

        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Last error</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="font-mono text-xs">ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Outbox is empty.</TableCell></TableRow>
              )}
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell><Badge variant="outline">{i.kind}</Badge></TableCell>
                  <TableCell>{i.attempts}</TableCell>
                  <TableCell className="text-xs text-destructive max-w-[280px] truncate">{i.lastError || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(i.createdAt).toLocaleTimeString()}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{i.id.slice(0, 12)}…</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
