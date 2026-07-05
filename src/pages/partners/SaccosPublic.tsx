import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Building2, Check, Users, Zap, Shield } from "lucide-react";

const ApplicationSchema = z.object({
  sacco_name: z.string().trim().min(2).max(200),
  county: z.string().trim().max(100).optional(),
  member_count_estimate: z.coerce.number().int().nonnegative().max(10_000_000).optional(),
  contact_name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email().max(255),
  contact_phone: z.string().trim().max(30).optional(),
  message: z.string().trim().max(4000).optional(),
});

export default function SaccosPublic() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    sacco_name: "", county: "", member_count_estimate: "",
    contact_name: "", contact_email: "", contact_phone: "", message: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const parsed = ApplicationSchema.safeParse({
      ...form,
      member_count_estimate: form.member_count_estimate || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.rpc("submit_sacco_application", {
      p_sacco_name: parsed.data.sacco_name,
      p_county: parsed.data.county ?? null,
      p_member_count_estimate: parsed.data.member_count_estimate ?? null,
      p_contact_name: parsed.data.contact_name,
      p_contact_email: parsed.data.contact_email,
      p_contact_phone: parsed.data.contact_phone ?? null,
      p_message: parsed.data.message ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("rate_limited") ? "Too many submissions — try again in an hour." : error.message);
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-emerald-950/20">
      <Helmet>
        <title>SACCO Partners — SmartReach AI</title>
        <meta name="description" content="Integrate your SACCO with SmartReach. Give 14k+ SACCO members instant access to Africa's SME Growth OS: M-Pesa, AI marketing, inbox, and financing." />
        <link rel="canonical" href="https://craft-your-journey-35.lovable.app/partners/saccos" />
      </Helmet>

      <header className="border-b bg-background/60 backdrop-blur">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-tight">SmartReach<span className="text-primary">.</span></Link>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
        </div>
      </header>

      <section className="container mx-auto px-6 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs mb-6">
          <Building2 className="h-3 w-3" /> For Kenya's 14,000+ SACCOs
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
          Turn every SACCO member into a <span className="text-primary">thriving SME</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Integrate SmartReach with your SACCO and give members instant access to unified inbox, M-Pesa payments,
          AI marketing, and — coming soon — revenue-based financing tied to their SmartReach Score.
        </p>
        <a href="#apply" className="inline-block mt-8">
          <Button size="lg">Apply to integrate</Button>
        </a>
      </section>

      <section className="container mx-auto px-6 pb-16 grid gap-4 md:grid-cols-3">
        {[
          { icon: Users, title: "Member growth OS", body: "White-labeled onboarding, Swahili & Sheng support, offline-first PWA — reaches every member on any device." },
          { icon: Zap, title: "Sync in one call", body: "Push your member roster via our REST API or upload CSV. Deduped, phone-normalized, audited." },
          { icon: Shield, title: "ODPC compliant", body: "Member phone numbers masked at rest for non-owners. Full audit log. RLS everywhere." },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-6 bg-card/40 backdrop-blur">
            <Icon className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground">{body}</p>
          </Card>
        ))}
      </section>

      <section id="apply" className="container mx-auto px-6 py-16 max-w-2xl">
        <Card className="p-8 bg-card/60 backdrop-blur">
          {submitted ? (
            <div className="text-center py-8">
              <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/20 grid place-items-center mb-4">
                <Check className="h-7 w-7 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Application received — asante!</h2>
              <p className="text-muted-foreground">
                Our partnerships team will be in touch within 3 business days at <span className="font-medium text-foreground">{form.contact_email}</span>.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-1">Apply to integrate</h2>
              <p className="text-muted-foreground mb-6">Tell us about your SACCO. We'll follow up with next steps.</p>
              <form className="space-y-4" onSubmit={submit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>SACCO name *</Label><Input required maxLength={200} value={form.sacco_name} onChange={(e) => setForm({ ...form, sacco_name: e.target.value })} /></div>
                  <div><Label>County</Label><Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} /></div>
                  <div><Label>Est. member count</Label><Input type="number" value={form.member_count_estimate} onChange={(e) => setForm({ ...form, member_count_estimate: e.target.value })} /></div>
                  <div><Label>Contact phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
                  <div><Label>Your name *</Label><Input required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
                  <div><Label>Your email *</Label><Input required type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
                </div>
                <div><Label>Anything else?</Label><Textarea rows={4} maxLength={4000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit application"}
                </Button>
              </form>
            </>
          )}
        </Card>
      </section>
    </div>
  );
}
