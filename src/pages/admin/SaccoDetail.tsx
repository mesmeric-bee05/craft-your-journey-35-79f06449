import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useSacco, useSaccoMembers, useSaccoImports,
  useImportSaccoMembersCSV, useIssueSaccoApiKey, useUpdateSacco,
  validateCsvRows, type ValidatedRow, type CsvImportResult,
} from "@/hooks/useSaccos";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, Key, ArrowLeft, Copy, Download, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

function maskPhone(p: string | null | undefined) {
  if (!p) return "—";
  return `+***${p.slice(-4)}`;
}

export default function SaccoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sacco } = useSacco(id);
  const { data: members = [] } = useSaccoMembers(id);
  const { data: imports = [] } = useSaccoImports(id);
  const importCsv = useImportSaccoMembersCSV();
  const issueKey = useIssueSaccoApiKey();
  const update = useUpdateSacco();

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ReturnType<typeof validateCsvRows> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CsvImportResult | null>(null);

  const handleFile = async (file: File) => {
    setCsvFile(file);
    setLastResult(null);
    const text = await file.text();
    const parsed = parseCSV(text).map((r) => ({
      external_member_id: r.external_member_id || r.member_id || r.id,
      full_name: r.full_name || r.name || "",
      phone: r.phone || r.msisdn,
      email: r.email,
      joined_at: r.joined_at || r.join_date,
    }));
    setValidation(validateCsvRows(parsed));
  };

  const downloadCsv = (rows: ValidatedRow[], filename: string) => {
    const header = "row,full_name,phone,email,external_member_id,joined_at,_errors\n";
    const body = rows.map((v) => [
      v.rowNumber, v.raw.full_name ?? "", v.raw.phone ?? "", v.raw.email ?? "",
      v.raw.external_member_id ?? "", v.raw.joined_at ?? "",
      `"${v.reasons.join("; ").replace(/"/g, '""')}"`,
    ].join(",")).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    if (!id || !validation) return;
    const rowsToSend = [...validation.valid, ...validation.warnings];
    if (rowsToSend.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }
    const res = await importCsv.mutateAsync({ saccoId: id, rows: rowsToSend });
    setLastResult(res);
    if (res.errors.length === 0) {
      setImportOpen(false);
      setCsvFile(null);
      setValidation(null);
    }
  };

  const rotateKey = async () => {
    if (!id) return;
    const res = await issueKey.mutateAsync(id);
    setIssuedKey(res.api_key);
  };

  if (!sacco) {
    return <DashboardLayout><div className="p-6 text-muted-foreground">Loading…</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <Helmet><title>{sacco.name} — SACCO Portal</title></Helmet>
      <div className="space-y-6 p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/saccos")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> All SACCOs
        </Button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{sacco.name}</h1>
            <p className="text-muted-foreground">{sacco.county || "—"} · Reg. {sacco.registration_no || "—"}</p>
          </div>
          <div className="flex gap-2">
            <Select value={sacco.loi_status} onValueChange={(v) => update.mutate({ id: sacco.id, loi_status: v as "none" | "signed" | "active" })}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Prospect</SelectItem>
                <SelectItem value="signed">LOI Signed</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild><Button variant="outline"><Upload className="h-4 w-4 mr-2" />Import CSV</Button></DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Import members</DialogTitle>
                  <DialogDescription>
                    CSV with headers: <code className="text-xs">full_name, phone, email, external_member_id, joined_at</code>.
                    Only <code>full_name</code> is required. Rows are validated and deduped before import.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="text-sm" />

                  {validation && (
                    <>
                      <div className="flex items-center gap-3 text-sm flex-wrap">
                        <Badge className="gap-1" variant="default"><CheckCircle2 className="h-3 w-3" />{validation.valid.length} valid</Badge>
                        <Badge className="gap-1" variant="secondary"><AlertTriangle className="h-3 w-3" />{validation.warnings.length} warnings</Badge>
                        <Badge className="gap-1" variant="destructive"><XCircle className="h-3 w-3" />{validation.errors.length} errors</Badge>
                        <span className="text-muted-foreground text-xs">{validation.duplicatesSkipped} duplicates skipped</span>
                        {validation.errors.length > 0 && (
                          <Button size="sm" variant="outline" className="ml-auto" onClick={() => downloadCsv(validation.errors, "sacco-import-errors.csv")}>
                            <Download className="h-3 w-3 mr-1" /> Errors CSV
                          </Button>
                        )}
                      </div>

                      <div className="rounded border text-xs max-h-72 overflow-auto">
                        <table className="w-full">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="p-1 text-left w-10">#</th>
                              <th className="p-1 text-left w-20">Status</th>
                              <th className="p-1 text-left">full_name</th>
                              <th className="p-1 text-left">phone</th>
                              <th className="p-1 text-left">email</th>
                              <th className="p-1 text-left">ext_id</th>
                            </tr>
                          </thead>
                          <tbody>
                            {validation.validated.slice(0, 50).map((v) => (
                              <Tooltip key={v.rowNumber}>
                                <TooltipTrigger asChild>
                                  <tr className={
                                    v.status === "error" ? "bg-destructive/10"
                                    : v.status === "warning" ? "bg-yellow-500/10" : ""
                                  }>
                                    <td className="p-1 text-muted-foreground">{v.rowNumber}</td>
                                    <td className="p-1 capitalize">{v.status}</td>
                                    <td className="p-1">{v.raw.full_name || <span className="text-destructive">—</span>}</td>
                                    <td className="p-1 font-mono">{v.raw.phone || "—"}</td>
                                    <td className="p-1">{v.raw.email || "—"}</td>
                                    <td className="p-1">{v.raw.external_member_id || "—"}</td>
                                  </tr>
                                </TooltipTrigger>
                                {v.reasons.length > 0 && (
                                  <TooltipContent>
                                    <ul className="text-xs list-disc pl-4">{v.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            ))}
                          </tbody>
                        </table>
                        {validation.validated.length > 50 && (
                          <div className="p-2 text-muted-foreground text-xs">Showing first 50 of {validation.validated.length} rows.</div>
                        )}
                      </div>
                    </>
                  )}

                  {lastResult && (
                    <div className="rounded border p-3 text-sm space-y-2">
                      <div>Imported {lastResult.created} · Failed {lastResult.errors.length}</div>
                      {lastResult.errors.length > 0 && (
                        <Button size="sm" variant="outline" onClick={() => {
                          const rows: ValidatedRow[] = lastResult.errors.map((e) => ({
                            rowNumber: e.row, raw: { full_name: "" }, normalizedPhone: null,
                            status: "error", reasons: [e.error],
                          }));
                          downloadCsv(rows, "sacco-import-failed.csv");
                        }}>
                          <Download className="h-3 w-3 mr-1" /> Failed rows CSV
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
                  <Button onClick={runImport} disabled={!validation || (validation.valid.length + validation.warnings.length) === 0 || importCsv.isPending}>
                    Import {validation ? `${validation.valid.length + validation.warnings.length} rows` : ""}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Members (imported)</div><div className="text-2xl font-bold">{members.length}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Estimated size</div><div className="text-2xl font-bold">{sacco.member_count_estimate.toLocaleString()}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Claimed</div><div className="text-2xl font-bold">{members.filter((m: { status: string }) => m.status === "claimed").length}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Recent imports</div><div className="text-2xl font-bold">{imports.length}</div></Card>
        </div>

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="imports">Imports</TabsTrigger>
            <TabsTrigger value="api">API Access</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4">
            <div className="rounded-lg border bg-card/40">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead>
                  <TableHead>Status</TableHead><TableHead>Joined</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {members.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No members imported yet.</TableCell></TableRow>}
                  {members.map((m: { id: string; full_name: string; phone: string | null; email: string | null; status: string; joined_at: string | null }) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.full_name}</TableCell>
                      <TableCell className="font-mono text-xs">{maskPhone(m.phone)}</TableCell>
                      <TableCell className="text-xs">{m.email || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{m.status}</Badge></TableCell>
                      <TableCell className="text-xs">{m.joined_at || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="imports" className="mt-4">
            <div className="rounded-lg border bg-card/40">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Source</TableHead><TableHead>Rows</TableHead><TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead><TableHead>Errors</TableHead><TableHead>When</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {imports.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No imports yet.</TableCell></TableRow>}
                  {imports.map((i: { id: string; source: string; row_count: number; created_count: number; updated_count: number; error_count: number; started_at: string }) => (
                    <TableRow key={i.id}>
                      <TableCell className="capitalize">{i.source}</TableCell>
                      <TableCell>{i.row_count}</TableCell>
                      <TableCell className="text-emerald-500">{i.created_count}</TableCell>
                      <TableCell className="text-sky-500">{i.updated_count}</TableCell>
                      <TableCell className={i.error_count > 0 ? "text-destructive" : ""}>{i.error_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(i.started_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="api" className="mt-4 space-y-4">
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4" />Partner Sync API Key</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Issue a key for this SACCO's IT team to sync members programmatically via <code className="text-xs">POST /functions/v1/sacco-sync</code>.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="font-mono text-sm">
                  {sacco.api_key_last4 ? `sk_sacco_••••••••${sacco.api_key_last4}` : "No key issued yet"}
                </div>
                <Button onClick={rotateKey} disabled={issueKey.isPending}>
                  {sacco.api_key_last4 ? "Rotate key" : "Issue key"}
                </Button>
              </div>
              {issuedKey && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <p className="text-sm font-medium mb-2">Copy this key now — it will not be shown again:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-background/60 p-2 rounded flex-1 break-all">{issuedKey}</code>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(issuedKey); toast.success("Copied"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="rounded-lg bg-muted/40 p-4 text-xs font-mono whitespace-pre overflow-x-auto">
{`curl -X POST https://<project>.functions.supabase.co/sacco-sync \\
  -H "X-Sacco-Api-Key: <your-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"members":[{"external_member_id":"M-001","full_name":"Jane Doe","phone":"+254712345678"}]}'`}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
