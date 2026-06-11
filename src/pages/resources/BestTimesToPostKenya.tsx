import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, MessageCircle, Instagram, Music2 } from "lucide-react";

const SLOTS: Array<{
  platform: string;
  icon: any;
  color: string;
  bg: string;
  bestTimes: { day: string; window: string; why: string }[];
}> = [
  {
    platform: "WhatsApp Status & Broadcasts",
    icon: MessageCircle,
    color: "text-green-500",
    bg: "bg-green-500/10",
    bestTimes: [
      { day: "Mon – Fri", window: "12:30 – 14:00 EAT", why: "Lunch break window in Nairobi CBD, Mombasa & Kisumu — bodaboda riders idle, office workers scrolling." },
      { day: "Mon – Fri", window: "19:30 – 21:30 EAT", why: "Post-commute, post-dinner — highest WhatsApp engagement window in East Africa." },
      { day: "Saturday", window: "10:00 – 12:00 EAT", why: "Weekend shopping research — perfect for product drops & price lists." },
    ],
  },
  {
    platform: "Instagram (Feed + Reels)",
    icon: Instagram,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    bestTimes: [
      { day: "Tue & Thu", window: "07:00 – 08:30 EAT", why: "Matatu commute scroll — captive audience on phones for 45-90 min." },
      { day: "Wed & Fri", window: "20:00 – 22:00 EAT", why: "Prime time. Highest Reels watch-through rates in Nairobi metro." },
      { day: "Sunday", window: "11:00 – 13:00 EAT", why: "Lazy-Sunday discovery — strongest day for lifestyle, food & fashion verticals." },
    ],
  },
  {
    platform: "TikTok",
    icon: Music2,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    bestTimes: [
      { day: "Daily", window: "21:00 – 23:30 EAT", why: "Late-night For-You scroll peak. Algorithm pushes new uploads hardest in this window." },
      { day: "Wed & Sat", window: "06:30 – 08:00 EAT", why: "Morning scroll spike — strong for comedy, news-jacking, and trending audios." },
      { day: "Friday", window: "16:00 – 18:00 EAT", why: "End-of-week boost — paydays (28th–30th) supercharge this slot for retail/MSME content." },
    ],
  },
];

export default function BestTimesToPostKenya() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Best Times to Post on Social Media in Kenya (2026)",
    description: "Data-driven posting times for Instagram, TikTok and WhatsApp targeting Kenyan and East African audiences.",
    inLanguage: "en-KE",
    author: { "@type": "Organization", name: "SmartReach AI" },
    publisher: { "@type": "Organization", name: "SmartReach AI" },
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Best Times to Post on Social Media in Kenya (2026)"
        description="Data-driven posting times for Instagram, TikTok & WhatsApp targeting Kenyan SMEs — local EAT slots and the behavior patterns behind them."
        path="/resources/best-times-to-post-kenya"
        type="article"
        jsonLd={articleLd}
      />

      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to SmartReach AI
          </Link>
          <Badge variant="secondary">Resource</Badge>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-foreground">
          Best Times to Post on Social Media in Kenya (2026)
        </h1>
        <p className="mt-3 text-sm text-muted-foreground inline-flex items-center gap-2">
          <Clock className="w-4 h-4" /> All times in East Africa Time (EAT, UTC+3)
        </p>

        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Global "best time to post" guides miss the rhythms of the Kenyan and East African market —
          matatu commute spikes, lunch-hour CBD scrolling, paycycle behaviour around the 28th–30th, and
          the late-night TikTok For-You binge. These are the slots Kenyan MSMEs on SmartReach AI publish
          to and consistently win engagement on.
        </p>

        {SLOTS.map((s) => (
          <section key={s.platform} className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <h2 className="text-xl font-display font-semibold text-foreground">{s.platform}</h2>
            </div>
            <div className="grid gap-3">
              {s.bestTimes.map((t) => (
                <Card key={t.window}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-semibold text-foreground">{t.window}</span>
                      <Badge variant="outline" className="text-xs">{t.day}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{t.why}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-12 rounded-xl border border-border bg-muted/30 p-6">
          <h2 className="text-lg font-semibold text-foreground">Methodology</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Slots are derived from aggregated, anonymised posting + engagement data across SmartReach AI
            customer accounts in Kenya (Nairobi, Mombasa, Kisumu, Nakuru, Eldoret) from Q3 2025 – Q1 2026,
            cross-referenced with Communication Authority of Kenya mobile-data peak windows.
          </p>
        </section>

        <div className="mt-12 flex flex-col sm:flex-row gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90"
          >
            Schedule posts at these times — free
          </Link>
          <Link
            to="/help"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
          >
            How SmartReach scheduling works
          </Link>
        </div>
      </article>
    </div>
  );
}
