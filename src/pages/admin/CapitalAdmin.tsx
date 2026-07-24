import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useCapitalAdminQueue,
  useApproveApplication,
  useRejectApplication,
  useDisburseAdvance,
  type CapitalApplicationRow,
} from "@/hooks/useCapital";
import { supabase } from "@/integrations/supabase/client";
import { CapitalAuditTimeline } from "@/components/capital/CapitalAuditTimeline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Banknote, Check, X, AlertCircle, Inbox, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

type StatusFilter = "all" | "submitted" | "under_review";
type SortOrder = "oldest" | "newest";

export default function CapitalAdmin() {
  const { data: queue = [], isLoading, isError, error, refetch, isRefetching } = useCapitalAdminQueue();
  const approve = useApproveApplication();
  const reject = useRejectApplication();
  const disburse = useDisburseAdvance();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("oldest");

  const visible = useMemo(() => {
    const filtered = statusFilter === "all"
      ? queue
      : queue.filter((a) => a.status === statusFilter);
    return [...filtered].sort((a, b) => {
      const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === "oldest" ? t : -t;
    });
  }, [queue, statusFilter, sortOrder]);

  const handleApprove = async (a: CapitalApplicationRow) => {
    setPendingId(a.id);
    try { await approve.mutateAsync({ id: a.id, note: notes[a.id] }); }
    finally { setPendingId(null); }
  };
  const handleReject = async (a: CapitalApplicationRow) => {
    const note = notes[a.id]?.trim();
    if (!note) { toast.error("Add a note explaining the rejection"); return; }
    setPendingId(a.id);
    try { await reject.mutateAsync({ id: a.id, note }); }
    finally { setPendingId(null); }
  };

  return (
    <DashboardLayout>
      <Helmet><title>Capital Review Queue — Admin</title></Helmet>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Banknote className="h-7 w-7 text-primary" /> Capital Review Queue
            </h1>
            <p className="text-muted-foreground mt-1">Approve or reject pending SmartReach Capital applications.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All pending</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/capital/ops">Operations</a>
            </Button>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isRefetching} aria-label="Refresh">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-6 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <div className="grid grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((j) => <Skeleton key={j} className="h-12" />)}
                </div>
              </Card>
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <Card className="p-8 border-destructive/40 bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold">Couldn't load review queue</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : "An unexpected error occurred."}
                </p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Retry
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!isLoading && !isError && visible.length === 0 && (
          <Card className="p-10 text-center">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground/60" />
            <div className="mt-3 font-medium">No applications to review</div>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter === "all"
                ? "New capital applications will appear here."
                : "Try switching to a different status filter."}
            </p>
          </Card>
        )}

        {visible.map((a) => {
          const rowBusy = pendingId === a.id;
          return (
            <Card key={a.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold text-lg">{a.businesses?.name ?? "Unknown business"}</div>
                  <div className="text-xs text-muted-foreground">
                    Applied {new Date(a.created_at).toLocaleString()} · signed "{a.esign_name ?? "—"}"
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{a.status.replace("_", " ")}</Badge>
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

              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => handleApprove(a)} disabled={rowBusy}>
                  {rowBusy && approve.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    // Find advance id from application id
                    const { data: adv } = await supabase.from("capital_advances")
                      .select("id").eq("application_id", a.id).maybeSingle();
                    if (!adv?.id) { toast.error("No advance yet — approve first"); return; }
                    setPendingId(a.id);
                    try { await disburse.mutateAsync(adv.id); } finally { setPendingId(null); }
                  }}
                  disabled={rowBusy}
                >
                  {rowBusy && disburse.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Banknote className="h-4 w-4 mr-1" />}
                  Disburse via M-Pesa
                </Button>
                <Button variant="destructive" onClick={() => handleReject(a)} disabled={rowBusy}>
                  {rowBusy && reject.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                  Reject
                </Button>
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">View audit history</Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <CapitalAuditTimeline applicationId={a.id} />
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
