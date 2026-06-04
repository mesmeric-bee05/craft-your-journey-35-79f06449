import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const submissionSchema = z.object({
  message: z.string().trim().min(3).max(2000),
  customer_name: z.string().trim().max(120).optional(),
  customer_email: z.string().trim().email().optional().or(z.literal("")),
  customer_phone: z.string().trim().max(40).optional().or(z.literal("")),
  rating: z.number().int().min(1).max(5).optional(),
});

interface FormRow {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  require_contact: boolean;
}

export default function FeedbackPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<FormRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("feedback_forms")
        .select("id, business_id, title, description, is_active, require_contact")
        .eq("slug", slug.toLowerCase())
        .eq("is_active", true)
        .maybeSingle();
      setForm((data as any) ?? null);
      setLoading(false);
    })();
  }, [slug]);

  const submit = async () => {
    if (!form) return;
    if (form.require_contact && !email && !phone) {
      toast.error("Please provide an email or phone");
      return;
    }
    const parsed = submissionSchema.safeParse({
      message,
      customer_name: name || undefined,
      customer_email: email || undefined,
      customer_phone: phone || undefined,
      rating: rating ?? undefined,
    });
    if (!parsed.success) {
      toast.error("Please write a longer message");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("feedback_submissions").insert({
      business_id: form.business_id,
      form_id: form.id,
      source: "public_form",
      message: parsed.data.message,
      customer_name: parsed.data.customer_name ?? null,
      customer_email: parsed.data.customer_email || null,
      customer_phone: parsed.data.customer_phone || null,
      rating: parsed.data.rating ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not send. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <h1 className="text-xl font-semibold mb-2">Form not found</h1>
            <p className="text-muted-foreground text-sm">
              This feedback form is not available or has been disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h1 className="text-xl font-semibold mb-2">Asante sana!</h1>
            <p className="text-muted-foreground text-sm">
              Your feedback has been received. The team will review it shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/30">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>{form.title}</CardTitle>
          </div>
          {form.description && <CardDescription>{form.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Rating (optional)</Label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n === rating ? null : n)}
                  className={`text-2xl transition ${
                    rating != null && n <= rating ? "text-yellow-400" : "text-muted-foreground"
                  }`}
                  aria-label={`${n} stars`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Your feedback *</Label>
            <Textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you liked or what we can improve..."
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Name {form.require_contact ? "" : "(optional)"}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label>Email {form.require_contact ? "*" : "(optional)"}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
            </div>
          </div>
          <div>
            <Label>Phone {form.require_contact ? "*" : "(optional)"}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
          </div>
          <Button className="w-full" onClick={submit} disabled={submitting || message.trim().length < 3}>
            {submitting ? "Sending..." : "Send feedback"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
