import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Copy, ShieldCheck, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const APP_NAME = "SmartReach AI";

function getMcpUrl(): string {
  const configured = import.meta.env.VITE_SUPABASE_URL as string;
  const url = new URL(configured);
  const legacy = url.hostname.endsWith(".lovable.cloud") && !url.hostname.startsWith("c--");
  const base = legacy
    ? `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`
    : url.toString().replace(/\/+$/, "");
  return `${base}/functions/v1/mcp`;
}

const SLUG = "smartreach-ai";
const quote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

function CopyBox({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="flex-1 break-all rounded-md border bg-muted px-3 py-2 text-sm">{value}</code>
      <Button
        variant="secondary"
        aria-label={label}
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success("Copied");
          setTimeout(() => setDone(false), 2000);
        }}
      >
        {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span className="ml-2">Copy</span>
      </Button>
    </div>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
      {items.map((i, n) => <li key={n}>{i}</li>)}
    </ol>
  );
}

export default function ConnectAssistant() {
  const mcpUrl = getMcpUrl();
  const claudeLink = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(APP_NAME)}&connectorUrl=${encodeURIComponent(mcpUrl)}`;
  const claudeCode = `claude mcp add --scope user --transport http ${SLUG} ${quote(mcpUrl)}`;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Connect your AI assistant</h1>
          <p className="text-muted-foreground">
            Let Claude, ChatGPT or another assistant look up your customers, products and SmartReach score, and add new customers for you.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your connection link</CardTitle>
            <CardDescription>Paste this link into your assistant when it asks for a server URL.</CardDescription>
          </CardHeader>
          <CardContent><CopyBox value={mcpUrl} label="Copy connection link" /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />How sign-in works</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>When you connect, your assistant opens a SmartReach page. Sign in with your usual account, then review and approve the request.</p>
            <p>The assistant then acts as you: it only sees your own business data, the same way you do in the app. It cannot see payments, wallet, Capital, wellness journals or other people's data.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Set up your assistant</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="claude">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="claude">Claude</TabsTrigger>
                <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
                <TabsTrigger value="code">Claude Code</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>
              <TabsContent value="claude" className="pt-4">
                <Steps items={[
                  <>Open <a className="underline" href={claudeLink} target="_blank" rel="noreferrer">Claude's add connector page <ExternalLink className="inline h-3 w-3" /></a> — the name and link are filled in.</>,
                  "Check the details and click \"Add\".",
                  "If the form isn't filled in, go to Connectors, choose \"Add custom connector\", name it SmartReach AI and paste the link above.",
                  "Click \"Connect\", sign in to SmartReach and approve.",
                  "Turn the connector on from the chat box, then ask Claude to use SmartReach.",
                ]} />
              </TabsContent>
              <TabsContent value="chatgpt" className="pt-4">
                <Steps items={[
                  <>Open <a className="underline" href="https://chatgpt.com/#settings/Connectors/Advanced" target="_blank" rel="noreferrer">ChatGPT settings</a> and turn on Developer mode (ask your admin if you can't).</>,
                  <>Open the <a className="underline" href="https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins" target="_blank" rel="noreferrer">New plugin</a> window.</>,
                  "Enter the name SmartReach AI and paste the link above.",
                  "Tick \"I understand and want to continue\" (ChatGPT shows this for every custom connection) and click \"Create\".",
                  "Sign in to SmartReach and approve, then turn the app on from the chat box.",
                ]} />
              </TabsContent>
              <TabsContent value="code" className="space-y-3 pt-4">
                <p className="text-sm">Run this one line in a terminal:</p>
                <CopyBox value={claudeCode} label="Copy Claude Code command" />
                <Steps items={[
                  "Start Claude Code and type /mcp.",
                  "Choose SmartReach AI and sign in when asked.",
                  "Ask Claude Code to use SmartReach.",
                ]} />
              </TabsContent>
              <TabsContent value="other" className="pt-4">
                <Steps items={[
                  "Open your assistant's MCP server or custom connector settings.",
                  "Add a remote MCP server.",
                  "Name it SmartReach AI and paste the link above.",
                  "Sign in to SmartReach and approve.",
                  "Turn the connection on and ask the assistant to use SmartReach.",
                ]} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Review what you're allowing</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="list-disc space-y-1 pl-5">
              <li>See your customers (name, phone, email, tags).</li>
              <li>See your products, prices and stock.</li>
              <li>See your SmartReach score.</li>
              <li><strong>Add new customers</strong> — the only action that changes data. It never deletes or edits.</li>
            </ul>
            <p className="text-muted-foreground">Most assistants ask before adding a customer. Check each request before you confirm.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" />Refresh after SmartReach updates</CardTitle></CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="c"><AccordionTrigger>Claude</AccordionTrigger><AccordionContent>
                <Steps items={["Open Connectors and select SmartReach AI.", "Refresh the connector's tools.", "If the link changed, remove the connector and add it again with the link above."]} />
              </AccordionContent></AccordionItem>
              <AccordionItem value="g"><AccordionTrigger>ChatGPT</AccordionTrigger><AccordionContent>
                <Steps items={["Open Plugins and select SmartReach AI.", "Scroll to \"Information\" and click \"Refresh\".", "If the link changed, delete the app and connect again.", "Start a new chat."]} />
              </AccordionContent></AccordionItem>
              <AccordionItem value="cc"><AccordionTrigger>Claude Code</AccordionTrigger><AccordionContent>
                <Steps items={["Start a new Claude Code session.", `If the link changed, run: claude mcp remove ${SLUG}, then run the install line again.`]} />
              </AccordionContent></AccordionItem>
              <AccordionItem value="o"><AccordionTrigger>Other assistants</AccordionTrigger><AccordionContent>
                <Steps items={["Open the connection you created.", "Refresh, reload or reconnect it.", "Paste the latest link if it changed, then start a new chat."]} />
              </AccordionContent></AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="1"><AccordionTrigger>Sign-in keeps looping</AccordionTrigger><AccordionContent className="text-sm">Sign in to SmartReach in the same browser first, then try connecting again. Allow pop-ups for your assistant.</AccordionContent></AccordionItem>
              <AccordionItem value="2"><AccordionTrigger>"No business found for this account"</AccordionTrigger><AccordionContent className="text-sm">Finish setting up your business in SmartReach, or ask the owner to invite you to their team.</AccordionContent></AccordionItem>
              <AccordionItem value="3"><AccordionTrigger>Tools are missing or out of date</AccordionTrigger><AccordionContent className="text-sm">Follow the refresh steps above and start a new chat.</AccordionContent></AccordionItem>
              <AccordionItem value="4"><AccordionTrigger>It says the link is wrong</AccordionTrigger><AccordionContent className="text-sm">Copy the link again from the top of this page — don't type it by hand.</AccordionContent></AccordionItem>
              <AccordionItem value="5"><AccordionTrigger>How do I remove access?</AccordionTrigger><AccordionContent className="text-sm">Remove the SmartReach connector in your assistant's settings. You can also change your password under <Link className="underline" to="/settings">Settings → Security</Link> to end all sessions.</AccordionContent></AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
