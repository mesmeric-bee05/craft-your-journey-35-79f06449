import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSaccos, useCreateSacco, type Sacco } from "@/hooks/useSaccos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2, Plus, Search } from "lucide-react";

const KENYAN_COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu", "Kiambu",
  "Machakos", "Kakamega", "Nyeri", "Meru", "Kilifi", "Kajiado",
];

function loiBadge(status: Sacco["loi_status"]) {
  const map = {
    active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
    signed: { label: "LOI Signed", cls: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
    none: { label: "Prospect", cls: "bg-muted text-muted-foreground border-border" },
  }[status];
  return <Badge variant="outline" className={map.cls}>{map.label}</Badge>;
}

export default function SaccoAdmin() {
  const [search, setSearch] = useState("");
  const [county, setCounty] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();

  const { data: saccos = [], isLoading } = useSaccos(search, county || undefined);
  const create = useCreateSacco();

  const [newSacco, setNewSacco] = useState({
    name: "",
    registration_no: "",
    county: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    member_count_estimate: 0,
  });

  const submit = async () => {
    if (!newSacco.name.trim()) return;
    await create.mutateAsync(newSacco);
    setAddOpen(false);
    setNewSacco({ name: "", registration_no: "", county: "", contact_name: "", contact_email: "", contact_phone: "", member_count_estimate: 0 });
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>SACCO Portal — Admin</title>
        <meta name="description" content="Manage the 14k+ SACCO partner directory, imports, and API integrations." />
      </Helmet>
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" /> SACCO Portal
            </h1>
            <p className="text-muted-foreground mt-1">
              Partner directory of Kenya's 14,000+ SACCOs. Import members, manage LOIs, issue sync API keys.
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add SACCO</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add SACCO</DialogTitle>
                <DialogDescription>Create a new partner SACCO record.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={newSacco.name} onChange={(e) => setNewSacco({ ...newSacco, name: e.target.value })} /></div>
                <div><Label>Registration No.</Label><Input value={newSacco.registration_no} onChange={(e) => setNewSacco({ ...newSacco, registration_no: e.target.value })} /></div>
                <div>
                  <Label>County</Label>
                  <Select value={newSacco.county} onValueChange={(v) => setNewSacco({ ...newSacco, county: v })}>
                    <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                    <SelectContent>
                      {KENYAN_COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Contact name</Label><Input value={newSacco.contact_name} onChange={(e) => setNewSacco({ ...newSacco, contact_name: e.target.value })} /></div>
                  <div><Label>Contact phone</Label><Input value={newSacco.contact_phone} onChange={(e) => setNewSacco({ ...newSacco, contact_phone: e.target.value })} /></div>
                </div>
                <div><Label>Contact email</Label><Input type="email" value={newSacco.contact_email} onChange={(e) => setNewSacco({ ...newSacco, contact_email: e.target.value })} /></div>
                <div><Label>Est. member count</Label><Input type="number" value={newSacco.member_count_estimate} onChange={(e) => setNewSacco({ ...newSacco, member_count_estimate: Number(e.target.value) })} /></div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={submit} disabled={!newSacco.name.trim() || create.isPending}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={county} onValueChange={setCounty}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All counties" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All counties</SelectItem>
              {KENYAN_COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card/40 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>County</TableHead>
                <TableHead>Members (est.)</TableHead>
                <TableHead>LOI</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              )}
              {!isLoading && saccos.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No SACCOs yet. Add one or import via CSV.</TableCell></TableRow>
              )}
              {saccos.map((s) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/admin/saccos/${s.id}`)}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.county || "—"}</TableCell>
                  <TableCell>{s.member_count_estimate.toLocaleString()}</TableCell>
                  <TableCell>{loiBadge(s.loi_status)}</TableCell>
                  <TableCell className="font-mono text-xs">{s.api_key_last4 ? `••••${s.api_key_last4}` : "—"}</TableCell>
                  <TableCell className="capitalize">{s.tier}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
