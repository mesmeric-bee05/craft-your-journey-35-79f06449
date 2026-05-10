import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useGeoIntel, useMapsBrowserKey, type GeoFilters } from "@/hooks/useGeoIntel";
import { MapPin, Plus, Trash2, Search, TrendingUp, Users, Building2 } from "lucide-react";
import { toast } from "sonner";

const ENTITY_TYPES = ["competitor", "supplier", "customer_cluster", "event", "landmark"];

declare global {
  interface Window { google?: any; __mapsLoaded__?: boolean; }
}

function loadMapsScript(key: string): Promise<void> {
  if (window.__mapsLoaded__) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    s.async = true; s.defer = true;
    s.onload = () => { window.__mapsLoaded__ = true; resolve(); };
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
}

export default function GeoIntel() {
  const [filters, setFilters] = useState<GeoFilters>({
    radiusKm: 10, geoLabels: [], entityTypes: [], days: 30,
  });
  const { locations, entities, insights, upsertLocation, deleteEntity, addEntity, ingestPlaces } = useGeoIntel(filters);
  const { data: mapsKey } = useMapsBrowserKey();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const primary = locations.data?.find((l) => l.is_primary) ?? locations.data?.[0];

  // Available labels from entities + locations
  const availableLabels = useMemo(() => {
    const set = new Set<string>();
    locations.data?.forEach((l) => l.geo_label && set.add(l.geo_label));
    entities.data?.forEach((e) => e.geo_label && set.add(e.geo_label));
    return Array.from(set);
  }, [locations.data, entities.data]);

  // Filtered entities by radius
  const filteredEntities = useMemo(() => {
    if (!primary || !entities.data) return entities.data ?? [];
    return entities.data.filter((e) => {
      const d = haversine(primary.lat, primary.lng, e.lat, e.lng);
      return d <= filters.radiusKm;
    });
  }, [primary, entities.data, filters.radiusKm]);

  // Aggregated insight cards
  const cards = useMemo(() => {
    const rows = insights.data ?? [];
    const filtered = filters.geoLabels.length ? rows.filter((r) => filters.geoLabels.includes(r.geo_label)) : rows;
    const opp = filtered.length ? Math.round(filtered.reduce((s, r) => s + r.opportunity_score, 0) / filtered.length) : 0;
    const reach = filtered.reduce((s, r) => s + r.customer_count, 0);
    const competitors = filteredEntities.filter((e) => e.entity_type === "competitor").length;
    const top = [...filtered].sort((a, b) => b.opportunity_score - a.opportunity_score)[0];
    const under = [...filtered].sort((a, b) => a.opportunity_score - b.opportunity_score)[0];
    return { opp, reach, competitors, top, under };
  }, [insights.data, filteredEntities, filters.geoLabels]);

  // Init map
  useEffect(() => {
    if (!mapsKey || !mapRef.current || !primary) return;
    loadMapsScript(mapsKey).then(() => {
      if (!mapRef.current || !window.google) return;
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: Number(primary.lat), lng: Number(primary.lng) },
        zoom: 12,
        mapTypeControl: false,
      });
      setMapReady(true);
    }).catch((e) => toast.error(e.message));
  }, [mapsKey, primary?.id]);

  // Render markers + radius
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !primary) return;
    const g = window.google;
    const map = mapInstance.current;
    // Clear previous overlays stored on map
    (map.__overlays__ ?? []).forEach((o: any) => o.setMap?.(null));
    const overlays: any[] = [];

    overlays.push(new g.maps.Marker({
      position: { lat: Number(primary.lat), lng: Number(primary.lng) },
      map, title: primary.name,
      icon: { path: g.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#1d4ed8", fillOpacity: 1, strokeWeight: 2, strokeColor: "#fff" },
    }));
    overlays.push(new g.maps.Circle({
      strokeColor: "#1d4ed8", strokeOpacity: 0.4, strokeWeight: 1,
      fillColor: "#1d4ed8", fillOpacity: 0.07,
      map, center: { lat: Number(primary.lat), lng: Number(primary.lng) },
      radius: filters.radiusKm * 1000,
    }));

    const colorByType: Record<string, string> = {
      competitor: "#dc2626", supplier: "#16a34a",
      customer_cluster: "#9333ea", event: "#f59e0b", landmark: "#0891b2",
    };
    filteredEntities
      .filter((e) => filters.entityTypes.length === 0 || filters.entityTypes.includes(e.entity_type))
      .forEach((e) => {
        overlays.push(new g.maps.Marker({
          position: { lat: Number(e.lat), lng: Number(e.lng) }, map, title: e.name,
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 6, fillColor: colorByType[e.entity_type] ?? "#666", fillOpacity: 0.85, strokeColor: "#fff", strokeWeight: 1 },
        }));
      });
    map.__overlays__ = overlays;
  }, [mapReady, primary, filteredEntities, filters.entityTypes, filters.radiusKm]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Geo-Intelligence</h1>
          <p className="text-muted-foreground">See where your customers, competitors and opportunities live.</p>
        </div>

        {!primary && (
          <OnboardingCard onSave={(p) => upsertLocation.mutate({ ...p, is_primary: true })} />
        )}

        {primary && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <KPI icon={<TrendingUp className="h-4 w-4" />} label="Opportunity score" value={cards.opp} suffix="/100" />
              <KPI icon={<Users className="h-4 w-4" />} label="Customer reach" value={cards.reach} />
              <KPI icon={<Building2 className="h-4 w-4" />} label="Competitors in radius" value={cards.competitors} />
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Best zone</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">{cards.top?.geo_label ?? "—"}</div>
                  <p className="text-xs text-muted-foreground">Score {cards.top?.opportunity_score ?? 0}</p>
                  {cards.under && (
                    <p className="text-xs text-muted-foreground mt-1">Underserved: {cards.under.geo_label} ({cards.under.opportunity_score})</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Map</CardTitle>
                  <CardDescription>Service radius, competitors and points of interest</CardDescription>
                </CardHeader>
                <CardContent>
                  {!mapsKey && <Skeleton className="h-[420px] w-full" />}
                  <div ref={mapRef} className="w-full h-[420px] rounded-md border" style={{ display: mapsKey ? "block" : "none" }} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1"><Label>Service radius</Label><span className="text-xs">{filters.radiusKm} km</span></div>
                    <Slider value={[filters.radiusKm]} min={1} max={50} step={1} onValueChange={([v]) => setFilters({ ...filters, radiusKm: v })} />
                  </div>
                  <div>
                    <Label>Date range</Label>
                    <Select value={String(filters.days)} onValueChange={(v) => setFilters({ ...filters, days: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Geo labels</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {availableLabels.length === 0 && <span className="text-xs text-muted-foreground">No labels yet</span>}
                      {availableLabels.map((l) => {
                        const on = filters.geoLabels.includes(l);
                        return (
                          <Badge key={l} variant={on ? "default" : "outline"} className="cursor-pointer"
                            onClick={() => setFilters({ ...filters, geoLabels: on ? filters.geoLabels.filter((x) => x !== l) : [...filters.geoLabels, l] })}>
                            {l}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label>Entity types</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ENTITY_TYPES.map((t) => {
                        const on = filters.entityTypes.includes(t);
                        return (
                          <Badge key={t} variant={on ? "default" : "outline"} className="cursor-pointer"
                            onClick={() => setFilters({ ...filters, entityTypes: on ? filters.entityTypes.filter((x) => x !== t) : [...filters.entityTypes, t] })}>
                            {t.replace("_", " ")}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="entities">
              <TabsList>
                <TabsTrigger value="entities">Entities ({filteredEntities.length})</TabsTrigger>
                <TabsTrigger value="ingest">Find places</TabsTrigger>
                <TabsTrigger value="add">Add manually</TabsTrigger>
              </TabsList>
              <div className="mt-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="grid gap-2 max-h-96 overflow-auto">
                      {filteredEntities.length === 0 && <p className="text-sm text-muted-foreground">No entities match your filters.</p>}
                      {filteredEntities.map((e) => (
                        <div key={e.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                          <div>
                            <div className="font-medium">{e.name}</div>
                            <div className="text-xs text-muted-foreground">{e.entity_type}{e.geo_label ? ` • ${e.geo_label}` : ""}</div>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => deleteEntity.mutate(e.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <div className="mt-3 flex gap-2">
                  <IngestDialog onIngest={(input) => ingestPlaces.mutate({ ...input, near: { lat: Number(primary.lat), lng: Number(primary.lng) } })} />
                  <AddEntityDialog onAdd={(e) => addEntity.mutate(e)} />
                </div>
              </div>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function KPI({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: number; suffix?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>{icon}
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}{suffix}</div></CardContent>
    </Card>
  );
}

function OnboardingCard({ onSave }: { onSave: (l: { name: string; lat: number; lng: number; geo_label?: string; service_radius_km: number }) => void }) {
  const [name, setName] = useState(""); const [lat, setLat] = useState(""); const [lng, setLng] = useState("");
  const [label, setLabel] = useState(""); const [radius, setRadius] = useState(5);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Set your primary location</CardTitle>
        <CardDescription>Drop a pin where your business operates so we can compute geo insights.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mama Njeri Kitchen, Kilimani" /></div>
        <div><Label>Geo label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="kilimani" /></div>
        <div><Label>Latitude</Label><Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-1.2921" /></div>
        <div><Label>Longitude</Label><Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="36.8219" /></div>
        <div className="md:col-span-2">
          <div className="flex justify-between"><Label>Service radius</Label><span className="text-xs">{radius} km</span></div>
          <Slider value={[radius]} min={1} max={50} step={1} onValueChange={([v]) => setRadius(v)} />
        </div>
        <div className="md:col-span-2">
          <Button onClick={() => {
            const la = Number(lat), ln = Number(lng);
            if (!name || isNaN(la) || isNaN(ln)) return toast.error("Please fill name + valid coordinates");
            onSave({ name, lat: la, lng: ln, geo_label: label || undefined, service_radius_km: radius });
          }}>Save location</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IngestDialog({ onIngest }: { onIngest: (i: { query: string; entity_type: string; geo_label?: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(""); const [type, setType] = useState("competitor"); const [label, setLabel] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Search className="h-4 w-4 mr-1" /> Find on Google Maps</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Search Google Places</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Query</Label><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="restaurants in Kilimani" /></div>
          <div><Label>Save as</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ENTITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Geo label (optional)</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => { onIngest({ query: q, entity_type: type, geo_label: label || undefined }); setOpen(false); }}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddEntityDialog({ onAdd }: { onAdd: (e: { name: string; lat: number; lng: number; entity_type: string; geo_label?: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [lat, setLat] = useState(""); const [lng, setLng] = useState("");
  const [type, setType] = useState("competitor"); const [label, setLabel] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-1" /> Add entity</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add entity</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Latitude</Label><Input value={lat} onChange={(e) => setLat(e.target.value)} /></div>
            <div><Label>Longitude</Label><Input value={lng} onChange={(e) => setLng(e.target.value)} /></div>
          </div>
          <div><Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ENTITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Geo label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            const la = Number(lat), ln = Number(lng);
            if (!name || isNaN(la) || isNaN(ln)) return toast.error("Provide name + coordinates");
            onAdd({ name, lat: la, lng: ln, entity_type: type, geo_label: label || undefined }); setOpen(false);
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function haversine(la1: number, lo1: number, la2: number, lo2: number) {
  const R = 6371;
  const dLat = ((la2 - la1) * Math.PI) / 180;
  const dLon = ((lo2 - lo1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
