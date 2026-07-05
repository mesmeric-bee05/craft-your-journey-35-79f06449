import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCapitalAdminQueue, useApproveApplication, useRejectApplication } from "@/hooks/useCapital";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Banknote, Check, X } from "lucide-react";

const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

export default function CapitalAdmin() {
  const { data: queue = [], isLoading } = useCapitalAdminQueue();
  const approve = useApproveApplication();
  const reject = useRejectApplication();
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <DashboardLayout>
      <Helmet><title>Capital Review Queue — Admin</title></Helmet>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Banknote className="h-7 w-7 text-primary" /> Capital Review Queue
          </h1>
          <p className="text-muted-foreground mt-1">Approve or reject pending SmartReach Capital applications.</p>
        </div>

        {isLoading && <Card className="p-6 text-muted-foreground">Loading…</Card>}
        {!isLoading && queue.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">No pending applications.</Card>
        )}

        {(queue as Array<Record<string, unknown> & {
          id: string; requested_amount_kes: number; revenue_share_pct: number; factor: number;
          total_repayment_kes: number; created_at: string; esign_name: string | null;
          offer_snapshot: { score?: number; monthly_gmv_kes?: number; business_age_days?: number } | null;
          businesses: { name: string } | null;
        }>).map((a) => (
          <Card key={a.id} className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold text-lg">{a.businesses?.name ?? "Unknown business"}</div>
                <div className="text-xs text-muted-foreground">Applied {new Date(a.created_at).toLocaleString()} · signed "{a.esign_name}"</div>
              </div>
              <Badge variant="outline">Pending review</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Requested</div><div className="font-semibold">{fmtKES(Number(a.requested_amount_kes))}</div></div>
              <div><div className="text-xs text-muted-foreground">Factor</div><div className="font-semibold">×{a.factor}</div></div>
              <div><div className="text-xs text-muted-foreground">Revenue share</div><div className="font-semibold">{a.revenue_share_pct}%</div></div>
              <div><div className="text-xs text-muted-foreground">Total repayment</div><div className="font-semibold">{fmtKES(Number(a.total_repayment_kes))}</div></div>
              <div><div className="text-xs text-muted-foreground">SmartReach Score</div><div className="font-semibold">{a.offer_snapshot?.score ?? "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">30-day GMV</div><div className="font-semibold">{fmtKES(Number(a.offer_snapshot?.monthly_gmv_kes ?? 0))}</div></div>
              <div><div className="text-xs text-muted-foreground">Business age</div><div className="font-semibold">{a.offer_snapshot?.business_age_days ?? 0}d</div></div>
            </div>

            <Textarea
              placeholder="Review note (optional for approval, required for rejection)…"
              value={notes[a.id] ?? ""}
              onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })}
              rows={2}
            />

            <div className="flex gap-2">
              <Button
                onClick={() => approve.mutate({ id: a.id, note: notes[a.id] })}
                disabled={approve.isPending}
              ><Check className="h-4 w-4 mr-1" />Approve & disburse</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!notes[a.id]) { alert("Add a note explaining the rejection"); return; }
                  reject.mutate({ id: a.id, note: notes[a.id] });
                }}
                disabled={reject.isPending}
              ><X className="h-4 w-4 mr-1" />Reject</Button>
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
