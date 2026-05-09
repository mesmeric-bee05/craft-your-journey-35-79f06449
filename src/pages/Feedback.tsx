import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useFeedbackSubmissions,
  useFeedbackForms,
  type FeedbackSubmission,
} from "@/hooks/useFeedbackSubmissions";
import { CheckCircle2, XCircle, ShieldAlert, Plus, Link as LinkIcon, Copy } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const manualSchema = z.object({
  message: z.string().trim().min(3).max(2000),
  customer_name: z.string().trim().max(120).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

const formSchema = z.object({
  slug: z.string().trim().min(3).max(40).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional(),
  require_contact: z.boolean().default(false),
});

export default function Feedback() {
  const [tab, setTab] = useState("pending");
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Wateja Sauti — Feedback</h1>
            <p className="text-muted-foreground">
              Capture, moderate and analyse customer feedback from every channel.
            </p>
          </div>
          <div className="flex gap-2">
            <ManualEntryDialog />
            <CreateFormDialog />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="forms">Public forms</TabsTrigger>
          </TabsList>

          <TabsContent value="pending"><ModerationList status="pending" /></TabsContent>
          <TabsContent value="approved"><ModerationList status="approved" /></TabsContent>
          <TabsContent value="rejected"><ModerationList status="rejected" /></TabsContent>
          <TabsContent value="forms"><FormsList /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function ModerationList({ status }: { status: string }) {
  const { submissions, moderate } = useFeedbackSubmissions(status);

  if (submissions.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  const rows = submissions.data ?? [];
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No {status} feedback yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <SubmissionCard key={row.id} row={row} onAction={(s) => moderate.mutate({ id: row.id, status: s })} />
      ))}
    </div>
  );
}

function SubmissionCard({
  row,
  onAction,
}: {
  row: FeedbackSubmission;
  onAction: (status: FeedbackSubmission["status"]) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="outline">{row.source}</Badge>
          {row.rating && <Badge variant="secondary">{"★".repeat(row.rating)}</Badge>}
          <span className="text-xs text-muted-foreground">
            {new Date(row.created_at).toLocaleString()}
          </span>
          {row.customer_name && (
            <span className="text-xs text-muted-foreground">— {row.customer_name}</span>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap mb-3">{row.message}</p>
        {row.status === "pending" && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAction("approved")}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAction("rejected")}>
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onAction("spam")}>
              <ShieldAlert className="h-4 w-4 mr-1" /> Spam
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FormsList() {
  const { forms, toggleActive } = useFeedbackForms();
  const origin = window.location.origin;

  if (forms.isLoading) return <Skeleton className="h-32 w-full" />;
  const rows = forms.data ?? [];
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No public forms yet. Click <strong>New form</strong> to create one.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((f) => {
        const url = `${origin}/feedback/${f.slug}`;
        return (
          <Card key={f.id}>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <strong>{f.title}</strong>
                  <Badge variant={f.is_active ? "default" : "outline"}>
                    {f.is_active ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    toast.success("Link copied");
                  }}
                  className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:underline"
                >
                  <LinkIcon className="h-3 w-3" /> {url} <Copy className="h-3 w-3" />
                </button>
              </div>
              <Switch
                checked={f.is_active}
                onCheckedChange={(v) => toggleActive.mutate({ id: f.id, is_active: v })}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ManualEntryDialog() {
  const { addManual } = useFeedbackSubmissions();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [rating, setRating] = useState<string>("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="h-4 w-4 mr-1" /> Add manually</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add offline feedback</DialogTitle>
          <DialogDescription>Use this for in-person, phone or other offline feedback.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Customer name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label>Rating (optional, 1-5)</Label>
            <Input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={addManual.isPending}
            onClick={() => {
              const parsed = manualSchema.safeParse({
                message,
                customer_name: name || undefined,
                rating: rating ? Number(rating) : undefined,
              });
              if (!parsed.success) {
                toast.error("Please enter a valid message");
                return;
              }
              addManual.mutate(parsed.data, {
                onSuccess: () => {
                  setOpen(false);
                  setMessage(""); setName(""); setRating("");
                },
              });
            }}
          >
            Save feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateFormDialog() {
  const { createForm, checkSlug } = useFeedbackForms();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requireContact, setRequireContact] = useState(false);

  const onCheck = async () => {
    const ok = await checkSlug(slug);
    setAvailable(ok);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> New form</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create public feedback form</DialogTitle>
          <DialogDescription>Share the link anywhere — anyone can submit.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-3">
            <div>
              <Label>Custom URL slug</Label>
              <div className="flex gap-2">
                <Input
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value.toLowerCase()); setAvailable(null); }}
                  placeholder="mama-njeri-kitchen"
                  maxLength={40}
                />
                <Button type="button" variant="outline" onClick={onCheck}>Check</Button>
              </div>
              {available === true && <p className="text-xs text-green-600 mt-1">Available</p>}
              {available === false && <p className="text-xs text-destructive mt-1">Taken or invalid</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Form URL: {window.location.origin}/feedback/{slug || "your-slug"}
              </p>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Require contact info</Label>
              <Switch checked={requireContact} onCheckedChange={setRequireContact} />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button
            disabled={createForm.isPending}
            onClick={() => {
              const parsed = formSchema.safeParse({
                slug, title, description: description || undefined, require_contact: requireContact,
              });
              if (!parsed.success) {
                toast.error("Check the slug and title");
                return;
              }
              createForm.mutate(parsed.data, {
                onSuccess: () => {
                  setOpen(false);
                  setSlug(""); setTitle(""); setDescription(""); setRequireContact(false); setAvailable(null);
                },
              });
            }}
          >
            Create form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
