import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SEO } from "@/components/seo/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useHealthScore } from "@/hooks/useHealthScore";
import { useBundles } from "@/hooks/useBundles";
import { Globe, Copy, ShieldCheck, Package, Star, RefreshCw, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PublicProfilePage() {
  const { profile, upsert, checkSlug } = usePublicProfile();
  const { score, recompute } = useHealthScore();
  const { bundles, upsert: saveBundle, remove } = useBundles();

  return (
    <DashboardLayout>
      <SEO title="Public profile — SmartReach" description="Customize your shareable public business profile." path="/public-profile" noindex />
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Public business profile</h1>
          <p className="text-muted-foreground">Showcase your trust score, bundles, and customer voice on a single shareable page.</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile"><Globe className="h-4 w-4 mr-1" /> Profile</TabsTrigger>
            <TabsTrigger value="health"><ShieldCheck className="h-4 w-4 mr-1" /> Health score</TabsTrigger>
            <TabsTrigger value="bundles"><Package className="h-4 w-4 mr-1" /> Bundles</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileForm profile={profile.data} loading={profile.isLoading} checkSlug={checkSlug} onSave={(p) => upsert.mutate(p)} />
          </TabsContent>

          <TabsContent value="health">
            <HealthCard score={score.data ?? null} loading={score.isLoading} onRecompute={() => recompute.mutate()} pending={recompute.isPending} />
          </TabsContent>

          <TabsContent value="bundles">
            <BundlesPanel bundles={bundles.data ?? []} loading={bundles.isLoading} onSave={(b) => saveBundle.mutate(b)} onRemove={(id) => remove.mutate(id)} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function ProfileForm({ profile, loading, checkSlug, onSave }: any) {
  const [slug, setSlug] = useState(""); const [tagline, setTagline] = useState("");
  const [hero, setHero] = useState(""); const [pub, setPub] = useState(false);
  const [showH, setShowH] = useState(true); const [showV, setShowV] = useState(true); const [showB, setShowB] = useState(true);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!profile) return;
    setSlug(profile.slug); setTagline(profile.tagline ?? ""); setHero(profile.hero_image_url ?? "");
    setPub(profile.is_published); setShowH(profile.show_health_score); setShowV(profile.show_voc_highlights); setShowB(profile.show_bundles);
  }, [profile]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  const url = `${window.location.origin}/biz/${slug || "your-slug"}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit your public page</CardTitle>
        <CardDescription>Choose your URL and decide what visitors see.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Public URL slug</Label>
          <div className="flex gap-2">
            <Input value={slug} onChange={(e) => { setSlug(e.target.value.toLowerCase()); setAvailable(null); }} placeholder="mama-njeri" maxLength={40} />
            <Button variant="outline" onClick={async () => setAvailable(await checkSlug(slug))}>Check</Button>
          </div>
          {available === true && <p className="text-xs text-green-600 mt-1">Available</p>}
          {available === false && <p className="text-xs text-destructive mt-1">Taken or invalid</p>}
          <button className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1 hover:underline"
            onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied"); }}>
            {url} <Copy className="h-3 w-3" />
          </button>
        </div>
        <div><Label>Tagline</Label><Input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={140} /></div>
        <div><Label>Hero image URL (optional)</Label><Input value={hero} onChange={(e) => setHero(e.target.value)} /></div>
        <Separator />
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle label="Published" v={pub} onChange={setPub} />
          <Toggle label="Show health score" v={showH} onChange={setShowH} />
          <Toggle label="Show VoC highlights" v={showV} onChange={setShowV} />
          <Toggle label="Show bundles" v={showB} onChange={setShowB} />
        </div>
        <Button onClick={() => onSave({ slug, tagline, hero_image_url: hero || null, is_published: pub, show_health_score: showH, show_voc_highlights: showV, show_bundles: showB })}>
          Save profile
        </Button>
      </CardContent>
    </Card>
  );
}

function Toggle({ label, v, onChange }: { label: string; v: boolean; onChange: (b: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border rounded-md p-3">
      <Label>{label}</Label>
      <Switch checked={v} onCheckedChange={onChange} />
    </div>
  );
}

function HealthCard({ score, loading, onRecompute, pending }: any) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">SmartReach Score
          <Button size="sm" variant="ghost" onClick={onRecompute} disabled={pending}>
            <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
        <CardDescription>Transparent breakdown of your health</CardDescription>
      </CardHeader>
      <CardContent>
        {!score ? (
          <p className="text-sm text-muted-foreground">No score yet — click refresh to compute.</p>
        ) : (
          <div className="space-y-3">
            <div className="text-5xl font-bold">{score.overall}<span className="text-lg text-muted-foreground">/100</span></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                ["Voice of customer", score.voc_component, "35%"],
                ["Engagement", score.engagement_component, "25%"],
                ["Inventory", score.inventory_component, "25%"],
                ["Growth", score.growth_component, "15%"],
              ].map(([k, v, w]) => (
                <div key={k as string} className="border rounded-md p-3">
                  <div className="text-xs text-muted-foreground">{k} <Badge variant="outline" className="ml-1 text-[10px]">{w}</Badge></div>
                  <div className="text-2xl font-semibold">{v as number}</div>
                </div>
              ))}
            </div>
            {score.factors && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Contributing factors</summary>
                <pre className="bg-muted/40 p-2 rounded mt-2 overflow-auto">{JSON.stringify(score.factors, null, 2)}</pre>
              </details>
            )}
            <p className="text-xs text-muted-foreground">Last computed: {new Date(score.computed_at).toLocaleString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BundlesPanel({ bundles, loading, onSave, onRemove }: any) {
  const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  const [price, setPrice] = useState(""); const [display, setDisplay] = useState(true);
  if (loading) return <Skeleton className="h-32 w-full" />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Create bundle</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div><Label>Price (KES)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="flex items-center justify-between"><Label>Show on public profile</Label>
            <Switch checked={display} onCheckedChange={setDisplay} /></div>
          <Button onClick={() => {
            if (!name) return toast.error("Name required");
            onSave({ name, description: desc, price_kes: Number(price) || 0, display_on_profile: display });
            setName(""); setDesc(""); setPrice("");
          }}><Plus className="h-4 w-4 mr-1" />Save bundle</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Existing bundles ({bundles.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {bundles.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {bundles.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between border rounded-md p-2">
              <div>
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-muted-foreground">KES {Number(b.price_kes).toLocaleString()} {b.display_on_profile && <Badge variant="secondary" className="ml-1 text-[10px]"><Star className="h-3 w-3 mr-1" />Public</Badge>}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => onRemove(b.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
