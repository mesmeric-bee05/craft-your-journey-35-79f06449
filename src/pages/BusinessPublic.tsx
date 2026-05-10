import { useParams } from "react-router-dom";
import { usePublicProfileBySlug } from "@/hooks/usePublicProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Star, MapPin, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function BusinessPublic() {
  const { slug } = useParams();
  const { data, isLoading } = usePublicProfileBySlug(slug);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (!data?.health?.overall) return;
    const o = data.health.overall;
    if ([60, 75, 90].some((m) => o >= m)) {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 2500);
      return () => clearTimeout(t);
    }
  }, [data?.health?.overall]);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 text-white p-8"><Skeleton className="h-64 w-full bg-slate-800" /></div>;
  }
  if (!data) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center"><p>Profile not found.</p></div>;
  }

  const b = data.business;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      {confetti && <ConfettiBurst />}
      <header className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4">
          {b.logo_url && <img src={b.logo_url} alt={b.name} className="h-16 w-16 rounded-xl object-cover ring-2 ring-blue-400/40" />}
          <div>
            <h1 className="text-3xl font-bold">{b.name}</h1>
            {b.industry && <p className="text-blue-200/80 text-sm">{b.industry}</p>}
            {data.tagline && <p className="text-blue-100/80 mt-1">{data.tagline}</p>}
          </div>
        </div>
        {data.location && (
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-blue-200/90">
            <MapPin className="h-4 w-4" /> {data.location.name}{data.location.geo_label ? ` • ${data.location.geo_label}` : ""}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-6">
        {data.health && (
          <Card className="bg-blue-900/30 border-blue-800/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <ShieldBadge score={data.health.overall} />
                <div>
                  <div className="text-xs uppercase text-blue-200/80 tracking-wider">SmartReach Trust Score</div>
                  <div className="text-4xl font-bold">{data.health.overall}<span className="text-lg text-blue-300">/100</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {Object.entries(data.health.components).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-blue-950/40 border border-blue-800/40 p-3">
                    <div className="text-[11px] uppercase text-blue-300/80">{k}</div>
                    <div className="text-2xl font-semibold">{v as number}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {data.bundles?.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-300" /> Featured bundles</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {data.bundles.map((b: any) => (
                <Card key={b.id} className="bg-blue-900/20 border-blue-800/40">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{b.name}</div>
                        {b.description && <p className="text-sm text-blue-200/80 mt-1">{b.description}</p>}
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-100 border-blue-400/30">KES {Number(b.price_kes).toLocaleString()}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {data.voc_highlights?.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><Star className="h-5 w-5 text-yellow-400" /> What customers say</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {data.voc_highlights.map((v: any, i: number) => (
                <Card key={i} className="bg-blue-900/20 border-blue-800/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: v.rating ?? 5 }).map((_, j) => <Star key={j} className="h-3 w-3 text-yellow-400 fill-yellow-400" />)}
                    </div>
                    <p className="text-sm text-blue-100/90">"{v.message}"</p>
                    <p className="text-xs text-blue-300/70 mt-1">— {v.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-blue-300/60">Powered by SmartReach</footer>
    </div>
  );
}

function ShieldBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative">
      <ShieldCheck className="h-16 w-16" style={{ color }} />
    </div>
  );
}

function ConfettiBurst() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-start justify-center pt-20">
      <div className="text-3xl font-bold text-yellow-300 animate-bounce drop-shadow-lg">🎉 Hongera!</div>
    </div>
  );
}
