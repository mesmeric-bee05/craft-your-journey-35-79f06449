import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VERCEL = "https://craft-your-journey-ecru.vercel.app";

function CopyLine({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-2">
        <code className="flex-1 break-all rounded-md border bg-muted px-2 py-1.5 text-xs">{value}</code>
        <Button size="icon" variant="secondary" aria-label={`Copy ${label}`} onClick={async () => {
          await navigator.clipboard.writeText(value); setDone(true); toast.success("Copied");
          setTimeout(() => setDone(false), 1500);
        }}>{done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
      </div>
    </div>
  );
}

type Step = { id: string; title: string; why: string; items: React.ReactNode[]; extra?: React.ReactNode };

type MpesaStatus = {
  configured: boolean; mode: "test" | "live"; payment_type: "paybill" | "till";
  callback_token_set: boolean; receiver_last3: string | null;
  credentials_accepted: boolean | null; checked_at: string;
};

function MpesaCheck() {
  const [loading, setLoading] = useState(false);
  const [st, setSt] = useState<MpesaStatus | null>(null);
  const run = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke<MpesaStatus>("mpesa-status", { body: {} });
    setLoading(false);
    if (error || !data) { toast.error("Couldn't check M-Pesa keys. Admins only."); return; }
    setSt(data);
  };
  const ready = st?.configured && st.mode === "live" && st.credentials_accepted;
  return (
    <div className="space-y-2 rounded-md border border-border/60 p-3 text-sm">
      <Button size="sm" variant="outline" onClick={run} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Check my M-Pesa keys
      </Button>
      <p className="text-xs text-muted-foreground">Asks Safaricom if your keys work. Never charges anyone.</p>
      {st && (
        <ul className="space-y-1">
          <li>Keys saved: <b>{st.configured ? "yes" : "no"}</b></li>
          <li>Mode: <b>{st.mode === "live" ? "Live (real money)" : "Test (no real money)"}</b></li>
          <li>Payment type: <b>{st.payment_type === "paybill" ? "Paybill" : "Till (Buy Goods)"}</b>{st.receiver_last3 && <> · number ending {st.receiver_last3}</>}</li>
          <li>Safaricom accepts keys: <b>{st.credentials_accepted == null ? "not checked" : st.credentials_accepted ? "yes" : "no"}</b></li>
          <li className={ready ? "text-primary" : "text-destructive"}>
            {ready ? "Ready for a real payment." : "Not ready for real money yet: live Safaricom keys and live mode are needed."}
          </li>
        </ul>
      )}
    </div>
  );
}


type LiveCheck = { ready: boolean; shortcode_is_real: boolean; passkey_looks_valid: boolean; live_credentials_accepted: boolean; shortcode_last3: string };
function LiveKeyCheck() {
  const [f, setF] = useState({ consumer_key: "", consumer_secret: "", passkey: "", shortcode: "" });
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState<LiveCheck | null>(null);
  const run = async () => {
    setLoading(true); setR(null);
    const { data, error } = await supabase.functions.invoke<LiveCheck>("mpesa-validate-credentials", { body: f });
    setLoading(false);
    // Clear typed values right away; they are never stored by the app.
    setF({ consumer_key: "", consumer_secret: "", passkey: "", shortcode: "" });
    if (error || !data) { toast.error("Check failed. Admins only, up to 10 checks an hour."); return; }
    setR(data);
  };
  const field = (k: keyof typeof f, label: string) => (
    <label className="block space-y-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Input type={k === "shortcode" ? "text" : "password"} autoComplete="off" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="mt-3 space-y-2 rounded-md border border-border/60 p-3 text-sm">
      <p className="font-medium">Test my live Safaricom keys</p>
      <p className="text-xs text-muted-foreground">Admins only. Asks Safaricom if live keys work, never charges, and never saves what you type. Saving is done in the secure form we send you in chat.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {field("consumer_key", "Live consumer key")}
        {field("consumer_secret", "Live consumer secret")}
        {field("passkey", "Live passkey")}
        {field("shortcode", "Your Paybill number")}
      </div>
      <Button size="sm" onClick={run} disabled={loading || Object.values(f).some((v) => !v.trim())}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Test live keys
      </Button>
      {r && (
        <ul className="space-y-1 text-xs">
          <li>Real Paybill (not practice): <b>{r.shortcode_is_real ? "yes" : "no"}</b> · ending {r.shortcode_last3}</li>
          <li>Passkey format looks right: <b>{r.passkey_looks_valid ? "yes" : "no"}</b></li>
          <li>Safaricom accepts live keys: <b>{r.live_credentials_accepted ? "yes" : "no"}</b></li>
          <li className={r.ready ? "text-primary" : "text-destructive"}>{r.ready ? "Ready. Tell us in chat and we'll open the secure save form." : "Not ready. Check the values from your Safaricom Daraja live app."}</li>
        </ul>
      )}
    </div>
  );
}

function VerifyBusinesses() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-verify-businesses"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("id, name, is_verified").order("name").limit(500);
      if (error) throw error;
      return data;
    },
  });
  const set = async (id: string, v: boolean) => {
    const { error } = await supabase.from("businesses").update({ is_verified: v }).eq("id", id);
    if (error) { toast.error("Only admins can change the verified badge."); return; }
    toast.success(v ? "Business verified" : "Badge removed");
    qc.invalidateQueries({ queryKey: ["admin-verify-businesses"] });
  };
  const rows = (data ?? []).filter((b) => b.name?.toLowerCase().includes(q.toLowerCase()));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><BadgeCheck className="h-5 w-5 text-primary" />Verified badge</CardTitle>
        <CardDescription>Only admins can give or remove it. Other users are refused.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Search businesses" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search businesses" />
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Couldn't load businesses.</p>}
        {!isLoading && !error && rows.length === 0 && <p className="text-sm text-muted-foreground">No businesses found.</p>}
        <ul className="max-h-72 divide-y divide-border overflow-y-auto">
          {rows.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="truncate">{b.name}</span>
              <Switch checked={!!b.is_verified} onCheckedChange={(v) => set(b.id, v)} aria-label={`Verified badge for ${b.name}`} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const steps: Step[] = [
  {
    id: "vercel", title: "1. Connect the Vercel site to this backend",
    why: "So the Vercel site shares the same sign-in, data and AI as the main live link.",
    items: [
      <>Open vercel.com → your project → <b>Settings</b> → <b>Environment Variables</b>.</>,
      <>Replace the three values below (they're public, not secret).</>,
      <>Delete any AI or provider keys stored there — they must never be in the website.</>,
      <>Go to <b>Deployments</b> → the latest one → <b>Redeploy</b>.</>,
    ],
    extra: (
      <div className="space-y-2">
        <CopyLine label="VITE_SUPABASE_URL" value={import.meta.env.VITE_SUPABASE_URL ?? ""} />
        <CopyLine label="VITE_SUPABASE_PUBLISHABLE_KEY" value={import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""} />
        <CopyLine label="VITE_SUPABASE_PROJECT_ID" value={import.meta.env.VITE_SUPABASE_PROJECT_ID ?? ""} />
      </div>
    ),
  },
  {
    id: "redirect", title: "2. Allow the Vercel address for sign-in emails",
    why: "So confirm and password-reset emails bring people back to the Vercel site.",
    items: [
      <>In Lovable: <b>More → Users → Auth settings → Advanced → Redirect URLs</b>.</>,
      <>Add the address below and save.</>,
      <>Test: on the Vercel site use <b>Forgot password</b> and check the email link opens Vercel.</>,
    ],
    extra: <CopyLine label="Redirect URL" value={`${VERCEL}/**`} />,
  },
  {
    id: "mpesa", title: "3. Small real M-Pesa payment",
    why: "Proves the wallet balance and transaction status update from a real Safaricom confirmation.",
    items: [
      <>Save your phone number (07XX…) in your <Link className="underline" to="/settings">Settings</Link>.</>,
      <>Open <Link className="underline" to="/till">Till</Link> → <b>Deposit</b> → enter <b>KES 10</b> → Send.</>,
      <>Enter your M-Pesa PIN on your phone.</>,
      <>Watch the balance and the new transaction turn <b>completed</b>, then tell us.</>,
    ],
    extra: <><MpesaCheck /><LiveKeyCheck /></>,
  },
  {
    id: "chatgpt", title: "4. Connect ChatGPT",
    why: "Lets ChatGPT read and add customers for your business only.",
    items: [
      <>ChatGPT → <b>Settings → Connectors</b> (turn on Developer mode if asked) → <b>Add connector</b>.</>,
      <>Paste the URL from <Link className="underline" to="/settings/ai-assistant">Connect your AI assistant</Link> (Copy button).</>,
      <>Sign in with your SmartReach account and approve access.</>,
      <>Ask “List my customers”, then “Add customer Jane, 0712345678”.</>,
    ],
  },
  {
    id: "voice", title: "5. Listen to the voice guide on your phone",
    why: "Phones have different voices; only a real device can tell which languages speak.",
    items: [
      <>On your phone open the live link → <Link className="underline" to="/capital">Capital</Link> → <b>Guide me by voice</b>.</>,
      <>Try English, Kiswahili, Sheng' and Kenglish.</>,
      <>Note which speak aloud and which show “plays as text”, and tell us.</>,
    ],
  },
  {
    id: "finance", title: "6. Pick one financing model",
    why: "All pages should use one set of numbers.",
    items: [
      <>Choose <b>Renewed KES 19.5M plan</b> or the <b>Source-of-Truth Baseline</b> figures.</>,
      <>Tell us your choice; every page will then use it.</>,
    ],
  },
];

const KEY = "setup-checklist-done";

export default function SetupChecklist() {
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  });
  const toggle = (id: string, v: boolean) => {
    const next = { ...done, [id]: v }; setDone(next); localStorage.setItem(KEY, JSON.stringify(next));
  };
  const count = steps.filter((s) => done[s.id]).length;
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Setup checklist</h1>
          <p className="text-sm text-muted-foreground">Six steps only you can do. {count} of {steps.length} done.</p>
        </div>
        {steps.map((s) => (
          <Card key={s.id} className={done[s.id] ? "opacity-70" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Checkbox id={s.id} checked={!!done[s.id]} onCheckedChange={(v) => toggle(s.id, v === true)} aria-label={`Mark ${s.title} done`} className="mt-1" />
                <div>
                  <CardTitle className="text-base"><label htmlFor={s.id}>{s.title}</label></CardTitle>
                  <CardDescription>{s.why}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pl-12">
              <ol className="list-decimal space-y-1.5 pl-4 text-sm">{s.items.map((it, i) => <li key={i}>{it}</li>)}</ol>
              {s.extra}
            </CardContent>
          </Card>
        ))}
        <VerifyBusinesses />
      </div>
    </DashboardLayout>
  );
}
