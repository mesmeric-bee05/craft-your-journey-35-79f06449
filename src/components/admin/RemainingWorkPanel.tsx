import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, CircleDashed, AlertTriangle, ArrowRight, Search } from "lucide-react";
import {
  REMAINING_WORK,
  WORK_AREAS,
  workSummary,
  type WorkItem,
  type WorkStatus,
} from "@/lib/remainingWork";

const STATUS_META: Record<
  WorkStatus,
  { label: string; icon: typeof CheckCircle2; badge: "default" | "secondary" | "destructive"; tone: string }
> = {
  done: { label: "Done", icon: CheckCircle2, badge: "secondary", tone: "text-emerald-600" },
  partial: { label: "Partly done", icon: CircleDashed, badge: "default", tone: "text-amber-600" },
  missing: { label: "Not started", icon: AlertTriangle, badge: "destructive", tone: "text-destructive" },
};

function ItemRow({ item }: { item: WorkItem }) {
  const meta = STATUS_META[item.status];
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.tone}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{item.title}</p>
          <Badge variant={meta.badge}>{meta.label}</Badge>
          <Badge variant="outline">{item.area}</Badge>
        </div>
        {item.next && <p className="mt-1 text-sm text-muted-foreground">{item.next}</p>}
        <p className="mt-1 text-xs text-muted-foreground">From plan: {item.source}</p>
      </div>
      {item.link && (
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link to={item.link}>
            Open <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
}

export function RemainingWorkPanel() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<string>("all");

  const summary = useMemo(() => workSummary(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return REMAINING_WORK.filter((i) => {
      if (area !== "all" && i.area !== area) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        (i.next ?? "").toLowerCase().includes(q) ||
        i.source.toLowerCase().includes(q) ||
        i.area.toLowerCase().includes(q)
      );
    });
  }, [query, area]);

  const open = filtered.filter((i) => i.status !== "done");
  const done = filtered.filter((i) => i.status === "done");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total commitments", value: summary.total, tone: "" },
          { label: "Done", value: summary.done, tone: "text-emerald-600" },
          { label: "Partly done", value: summary.partial, tone: "text-amber-600" },
          { label: "Not started", value: summary.missing, tone: "text-destructive" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-semibold ${s.tone}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Remaining work</CardTitle>
          <CardDescription>
            Every commitment from the approved plans, with anything still outstanding listed first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks"
                aria-label="Search remaining work"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={area === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setArea("all")}
              >
                All
              </Button>
              {WORK_AREAS.map((a) => (
                <Button
                  key={a}
                  variant={area === a ? "default" : "outline"}
                  size="sm"
                  onClick={() => setArea(a)}
                >
                  {a}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing matches that search.
            </p>
          )}

          {open.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Actionable tasks ({open.length})</h3>
              {open.map((i) => (
                <ItemRow key={i.id} item={i} />
              ))}
            </section>
          )}

          {done.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Completed ({done.length})
              </h3>
              {done.map((i) => (
                <ItemRow key={i.id} item={i} />
              ))}
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
