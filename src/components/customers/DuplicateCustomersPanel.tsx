import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy as CopyIcon, GitMerge } from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "@/hooks/useCustomers";

type Pair = { keep: Customer; dup: Customer };

/** Same-number and same-email customers are merged automatically by the database;
 * this panel catches same-name customers that may be the same person. */
export function DuplicateCustomersPanel({ customers, onMerged }: { customers: Customer[]; onMerged: () => void }) {
  const [pending, setPending] = useState<Pair | null>(null);
  const [busy, setBusy] = useState(false);

  const pairs = useMemo(() => {
    const byName = new Map<string, Customer[]>();
    for (const c of customers) {
      const key = (c.name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
      if (!key) continue;
      byName.set(key, [...(byName.get(key) ?? []), c]);
    }
    const out: Pair[] = [];
    for (const list of byName.values()) {
      if (list.length < 2) continue;
      const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
      for (const dup of sorted.slice(1)) out.push({ keep: sorted[0], dup });
    }
    return out;
  }, [customers]);

  if (pairs.length === 0) return null;

  const merge = async () => {
    if (!pending) return;
    setBusy(true);
    const { error } = await supabase.rpc("merge_customers", { _keep: pending.keep.id, _dup: pending.dup.id });
    setBusy(false);
    setPending(null);
    if (error) return toast.error("Could not merge these customers.");
    toast.success("Customers merged");
    onMerged();
  };

  const label = (c: Customer) => [c.phone, c.email].filter(Boolean).join(" · ") || "no contact details";

  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-3 p-4">
        <p className="flex items-center gap-2 font-medium">
          <CopyIcon className="h-4 w-4" /> Possible duplicates ({pairs.length})
        </p>
        <ul className="space-y-2">
          {pairs.slice(0, 10).map((p) => (
            <li key={p.dup.id} className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>
                <strong>{p.keep.name}</strong> — {label(p.keep)} <span className="text-muted-foreground">and</span> {label(p.dup)}
              </span>
              <Button size="sm" variant="secondary" onClick={() => setPending(p)}>
                <GitMerge className="mr-2 h-4 w-4" /> Merge
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge these customers?</AlertDialogTitle>
            <AlertDialogDescription>
              We'll keep the older record ({pending && label(pending.keep)}) and move conversations, tags and notes from
              the other ({pending && label(pending.dup)}) into it. The other record is then removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={merge}>Merge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
