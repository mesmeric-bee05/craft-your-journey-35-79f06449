import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SEO } from "@/components/seo/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Sparkles, RefreshCw, Package } from "lucide-react";
import { useBundles } from "@/hooks/useBundles";
import { useBundleItems } from "@/hooks/useBundleItems";
import { useBundleSuggestions } from "@/hooks/useBundleSuggestions";
import { useProducts } from "@/hooks/useProducts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";

const bundleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  price_kes: z.coerce.number().min(0).max(10_000_000),
  display_on_profile: z.boolean(),
});

function BundleEditor({ bundleId, onClose }: { bundleId: string; onClose: () => void }) {
  const { items, upsert, remove } = useBundleItems(bundleId);
  const { products } = useProducts();
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);

  const total = (items.data ?? []).reduce((s, it) => s + Number(it.unit_price_kes) * it.quantity, 0);
  const productList = products;

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Items</h4>
        <Button size="sm" variant="ghost" onClick={onClose}>Done</Button>
      </div>
      <div className="space-y-2">
        {(items.data ?? []).map((it) => {
          const p = productList.find((p: any) => p.id === it.product_id);
          return (
            <div key={it.id} className="flex items-center justify-between gap-2 bg-background p-2 rounded">
              <div className="flex-1 text-sm">
                <span className="font-medium">{p?.name ?? "Product"}</span>
                <span className="text-muted-foreground"> × {it.quantity}</span>
              </div>
              <span className="text-sm text-muted-foreground">KES {Number(it.unit_price_kes).toLocaleString()}</span>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(it.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Add product" /></SelectTrigger>
          <SelectContent>
            {productList.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name} (KES {p.selling_price})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-20" />
        <Button
          size="sm"
          onClick={() => {
            const p = productList.find((p: any) => p.id === productId);
            if (!p) return;
            upsert.mutate({ bundle_id: bundleId, product_id: productId, quantity: qty, unit_price_kes: p.selling_price });
            setProductId(""); setQty(1);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="text-sm font-medium text-right">Items total: KES {total.toLocaleString()}</div>
    </div>
  );
}

function MyBundlesTab() {
  const { bundles, upsert, remove } = useBundles();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price_kes: 0, display_on_profile: false });
  const [showForm, setShowForm] = useState(false);

  const submit = () => {
    const r = bundleSchema.safeParse(form);
    if (!r.success) return;
    upsert.mutate({ ...r.data, items: [] as any });
    setForm({ name: "", description: "", price_kes: 0, display_on_profile: false });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4 mr-2" /> New bundle
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Price (KES)</Label><Input type="number" value={form.price_kes} onChange={(e) => setForm({ ...form, price_kes: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.display_on_profile} onCheckedChange={(v) => setForm({ ...form, display_on_profile: v })} />
              <Label>Show on public profile</Label>
            </div>
            <Button onClick={submit}>Save</Button>
          </CardContent>
        </Card>
      )}

      {bundles.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (bundles.data ?? []).length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-50" />No bundles yet</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {(bundles.data ?? []).map((b) => (
            <Card key={b.id}>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{b.name}</h3>
                    <p className="text-sm text-muted-foreground">{b.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.display_on_profile && <Badge variant="secondary">On profile</Badge>}
                    <span className="font-medium">KES {Number(b.price_kes).toLocaleString()}</span>
                    <Button size="sm" variant="outline" onClick={() => setEditing(editing === b.id ? null : b.id)}>
                      {editing === b.id ? "Close" : "Edit items"}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(b.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {editing === b.id && <BundleEditor bundleId={b.id} onClose={() => setEditing(null)} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionsTab() {
  const { suggestions, recompute, dismiss } = useBundleSuggestions();
  const { products } = useProducts();
  const nameFor = (id: string) => (products).find((p: any) => p.id === id)?.name ?? "Product";

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => recompute.mutate()} disabled={recompute.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${recompute.isPending ? "animate-spin" : ""}`} /> Recompute
        </Button>
      </div>
      {suggestions.isLoading ? (
        <Skeleton className="h-32" />
      ) : (suggestions.data ?? []).length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground"><Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />No suggestions yet. Click Recompute.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {(suggestions.data ?? []).map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.product_ids.map(nameFor).join(" + ")}</div>
                  <p className="text-sm text-muted-foreground">{s.rationale}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{Math.round(s.score * 100)}% match</Badge>
                  <Button size="sm" variant="ghost" onClick={() => dismiss.mutate(s.id)}>Dismiss</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Bundles() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-display font-bold">Bundles</h1>
          <p className="text-muted-foreground">Curate product bundles and showcase them on your public profile.</p>
        </div>
        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">My Bundles</TabsTrigger>
            <TabsTrigger value="ai">AI Suggestions</TabsTrigger>
          </TabsList>
          <TabsContent value="my"><MyBundlesTab /></TabsContent>
          <TabsContent value="ai"><SuggestionsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
