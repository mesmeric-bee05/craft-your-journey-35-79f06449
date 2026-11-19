import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Check } from "lucide-react";
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
      </div>
    </DashboardLayout>
  );
}
