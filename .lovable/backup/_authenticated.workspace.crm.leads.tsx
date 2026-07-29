import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, FileText } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { RowActions } from "@/components/RowActions";
import { useLeads, useSaveLead, useConvertLeadToQuotation, formatINR, formatDate, type LeadRow } from "@/features/crm/api";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/workspace/crm/leads")({
  component: LeadsPage,
});

const LEAD_STATUSES = [
  { key: "new", label: "New", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "contacted", label: "Contacted", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "qualified", label: "Qualified", tone: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "proposal", label: "Proposal", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  { key: "won", label: "Won", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "lost", label: "Lost", tone: "bg-rose-50 text-rose-700 border-rose-200" },
];
const SOURCES = ["website", "referral", "trade_show", "cold_call", "linkedin", "partner", "other"];

const emptyLead: Partial<LeadRow> = { title: "", contact_name: "", email: "", phone: "", company_name: "", source: "website", status: "new", expected_value: 0, win_probability: 10 };

function LeadsPage() {
  const { data: leads = [], isLoading } = useLeads();
  const save = useSaveLead();
  const convert = useConvertLeadToQuotation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [editing, setEditing] = useState<Partial<LeadRow> | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (status && l.status !== status) return false;
      if (source && l.source !== source) return false;
      if (!term) return true;
      return [l.title, l.contact_name, l.company_name, l.email, l.phone].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [leads, search, status, source]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search leads by title, contact, company…"
            filters={[
              { key: "status", label: "Status", value: status, onChange: setStatus, options: LEAD_STATUSES.map((s) => ({ value: s.key, label: s.label })) },
              { key: "source", label: "Source", value: source, onChange: setSource, options: SOURCES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })) },
            ]}
            actions={<Button size="sm" onClick={() => setEditing({ ...emptyLead })}><Plus className="h-4 w-4 mr-1.5" /> New lead</Button>}
          />

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Close date</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No leads yet. Click “New lead” to create one.</TableCell></TableRow>
                ) : filtered.map((l) => {
                  const tone = LEAD_STATUSES.find((s) => s.key === l.status)?.tone;
                  return (
                    <TableRow key={l.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium">{l.title}</div>
                        <div className="text-xs text-muted-foreground">{l.contact_name || l.email || "—"}</div>
                      </TableCell>
                      <TableCell>{l.company_name || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground capitalize">{l.source.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right font-medium">{formatINR(l.expected_value)}</TableCell>
                      <TableCell><StatusBadge label={LEAD_STATUSES.find((s) => s.key === l.status)?.label ?? l.status} tone={tone} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(l.expected_close_date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Convert to quotation"
                            disabled={convert.isPending || l.status === "won" || l.status === "lost"}
                            onClick={async () => {
                              await convert.mutateAsync(l.id);
                              navigate({ to: "/workspace/sales/quotations" });
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <RowActions
                            onEdit={() => setEditing(l)}
                            table="leads"
                            id={l.id}
                            invalidateKeys={[["crm", "leads"]]}
                            label="lead"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <FormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing.id ? "Edit lead" : "New lead"}
          submitting={save.isPending}
          onSubmit={async () => { await save.mutateAsync(editing); }}
        >
          <Field label="Title *"><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact name"><Input value={editing.contact_name ?? ""} onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })} /></Field>
            <Field label="Company"><Input value={editing.company_name ?? ""} onChange={(e) => setEditing({ ...editing, company_name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="Source">
              <Select value={editing.source ?? "other"} onValueChange={(v) => setEditing({ ...editing, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={editing.status ?? "new"} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Expected value (₹)"><Input type="number" value={editing.expected_value ?? 0} onChange={(e) => setEditing({ ...editing, expected_value: Number(e.target.value) })} /></Field>
            <Field label="Win probability (%)"><Input type="number" min={0} max={100} value={editing.win_probability ?? 0} onChange={(e) => setEditing({ ...editing, win_probability: Number(e.target.value) })} /></Field>
            <Field label="Expected close"><Input type="date" value={editing.expected_close_date ?? ""} onChange={(e) => setEditing({ ...editing, expected_close_date: e.target.value || null })} /></Field>
          </div>
        </FormDialog>
      )}
    </div>
  );
}