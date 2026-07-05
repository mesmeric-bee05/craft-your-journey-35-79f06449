import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/hooks/useBusiness";
import {
  useCapitalOffer, useMyAdvance, useMyApplications, useAdvanceRepayments,
  useApplyForCapital, useRecordRepayment,
} from "@/hooks/useCapital";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Banknote, TrendingUp, Shield, AlertCircle } from "lucide-react";

const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

export default function Capital() {
  const { business } = useBusiness();
  const bid = business?.id;
  const { data: offer, isLoading } = useCapitalOffer(bid);
  const { data: advance } = useMyAdvance(bid);
  const { data: apps = [] } = useMyApplications(bid);
  const { data: repayments = [] } = useAdvanceRepayments(advance?.id);
  const apply = useApplyForCapital();
  const record = useRecordRepayment();

  const [applyOpen, setApplyOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [rsPct, setRsPct] = useState(10);
  const [esign, setEsign] = useState("");
  const [terms, setTerms] = useState(false);

  const [repayAmount, setRepayAmount] = useState("");

  const openApply = () => {
    if (!offer?.eligible) return;
    setAmount(Math.min(50000, offer.max_advance_kes));
    setRsPct(offer.revenue_share_min_pct ?? 10);
    setEsign("");
    setTerms(false);
    setApplyOpen(true);
  };

  const submit = async () => {
    if (!bid || !terms) return;
    await apply.mutateAsync({
      business_id: bid,
      requested_amount: amount,
      revenue_share_pct: rsPct,
      esign_name: esign,
    });
    setApplyOpen(false);
  };

  const totalOwed = advance?.total_owed_kes ?? 0;
  const repaid = advance?.amount_repaid_kes ?? 0;
  const balance = Math.max(0, totalOwed - repaid);
  const pctRepaid = totalOwed > 0 ? (repaid / totalOwed) * 100 : 0;

  return (
    <DashboardLayout>
      <Helmet><title>SmartReach Capital — Financing</title></Helmet>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Banknote className="h-7 w-7 text-primary" /> SmartReach Capital
          </h1>
          <p className="text-muted-foreground mt-1">
            Revenue-based financing tied to your SmartReach Score. No fixed monthly payments — repay a small share of your daily M-Pesa income.
          </p>
        </div>

        {isLoading && <Card className="p-6 text-muted-foreground">Computing your offer…</Card>}

        {offer && !advance && (
          <Card className="p-6 bg-gradient-to-br from-emerald-900/30 to-background border-emerald-500/20">
            {offer.eligible ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-sm text-muted-foreground">You're pre-approved for up to</div>
                    <div className="text-4xl font-bold text-emerald-400">{fmtKES(offer.max_advance_kes)}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Total repayment: {fmtKES(offer.max_advance_kes * (offer.factor ?? 1))} · factor ×{offer.factor}
                    </div>
                  </div>
                  <Button size="lg" onClick={openApply}>Apply for advance</Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border/50">
                  <Stat label="SmartReach Score" value={String(offer.score)} icon={TrendingUp} />
                  <Stat label="30-day M-Pesa GMV" value={fmtKES(offer.monthly_gmv_kes)} icon={Banknote} />
                  <Stat label="Business age" value={`${offer.business_age_days} days`} icon={Shield} />
                  <Stat label="Revenue share" value={`${offer.revenue_share_min_pct}–${offer.revenue_share_max_pct}%`} icon={TrendingUp} />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <div className="font-semibold mb-1">Not eligible yet</div>
                  <p className="text-sm text-muted-foreground">{offer.reason}</p>
                </div>
              </div>
            )}
          </Card>
        )}

        {advance && (
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm text-muted-foreground">Active advance</div>
                <div className="text-3xl font-bold">{fmtKES(Number(advance.principal_kes))}</div>
                <div className="text-sm text-muted-foreground">Disbursed {new Date(advance.disbursed_at).toLocaleDateString()}</div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30" variant="outline">Active</Badge>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Repaid {fmtKES(repaid)}</span>
                <span className="text-muted-foreground">Balance {fmtKES(balance)}</span>
              </div>
              <Progress value={pctRepaid} />
            </div>
            <div className="flex gap-2 items-end pt-2 border-t border-border/50">
              <div className="flex-1">
                <Label className="text-xs">Record a manual repayment (KES)</Label>
                <Input type="number" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} />
              </div>
              <Button
                onClick={async () => {
                  const n = Number(repayAmount);
                  if (!n || n <= 0) return;
                  await record.mutateAsync({ advance_id: advance.id, amount: n });
                  setRepayAmount("");
                }}
                disabled={!repayAmount || record.isPending}
              >Record</Button>
            </div>
            {repayments.length > 0 && (
              <div className="pt-2">
                <div className="text-sm font-semibold mb-2">Repayment history</div>
                <ul className="space-y-1 text-sm">
                  {repayments.slice(0, 8).map((r: { id: string; amount_kes: number; source: string; scheduled_for: string | null; status: string }) => (
                    <li key={r.id} className="flex justify-between border-b border-border/40 py-1">
                      <span>{r.scheduled_for ?? "—"} · <span className="text-muted-foreground capitalize">{r.source}</span></span>
                      <span className="font-mono">{fmtKES(Number(r.amount_kes))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {apps.length > 0 && (
          <Card className="p-6">
            <div className="font-semibold mb-3">Application history</div>
            <ul className="space-y-2 text-sm">
              {apps.map((a: { id: string; requested_amount_kes: number; revenue_share_pct: number; status: string; created_at: string; review_note: string | null }) => (
                <li key={a.id} className="flex justify-between items-center border-b border-border/40 py-2">
                  <div>
                    <div className="font-medium">{fmtKES(Number(a.requested_amount_kes))} @ {a.revenue_share_pct}%</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                    {a.review_note && <div className="text-xs italic mt-1">"{a.review_note}"</div>}
                  </div>
                  <Badge variant="outline" className="capitalize">{a.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Apply for advance</DialogTitle>
              <DialogDescription>
                Choose amount and revenue share. Total repayment = amount × factor {offer?.factor}.
              </DialogDescription>
            </DialogHeader>
            {offer && (
              <div className="space-y-4">
                <div>
                  <Label>Amount (max {fmtKES(offer.max_advance_kes)})</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} max={offer.max_advance_kes} min={500} step={500} />
                </div>
                <div>
                  <Label>Daily revenue share: {rsPct}%</Label>
                  <Slider value={[rsPct]} min={offer.revenue_share_min_pct ?? 5} max={offer.revenue_share_max_pct ?? 20} step={1} onValueChange={([v]) => setRsPct(v)} />
                  <div className="text-xs text-muted-foreground mt-1">
                    {rsPct}% of daily M-Pesa income until {fmtKES(amount * (offer.factor ?? 1))} is repaid.
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>You receive</span><span className="font-mono">{fmtKES(amount)}</span></div>
                  <div className="flex justify-between"><span>Factor</span><span className="font-mono">×{offer.factor}</span></div>
                  <div className="flex justify-between font-semibold"><span>Total repayment</span><span className="font-mono">{fmtKES(amount * (offer.factor ?? 1))}</span></div>
                </div>
                <div>
                  <Label>Type your full legal name to sign</Label>
                  <Input value={esign} onChange={(e) => setEsign(e.target.value)} placeholder="e.g. Jane Wanjiku Mwangi" />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="terms" checked={terms} onCheckedChange={(v) => setTerms(!!v)} />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the revenue-share terms and authorize automatic collection from my M-Pesa till until fully repaid.
                  </label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setApplyOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={!terms || esign.length < 2 || amount < 500 || apply.isPending}>
                Submit application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" />{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
