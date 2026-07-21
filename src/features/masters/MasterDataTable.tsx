import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Download,
  History,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MasterDef, FieldDef } from "./types";

type Row = Record<string, unknown> & { id: string };

interface Props {
  master: MasterDef;
}

const PAGE_SIZE = 20;

export function MasterDataTable({ master }: Props) {
  const { company, hasRole, isCompanyAdmin, user } = useAuth();
  const qc = useQueryClient();
  const canEdit =
    isCompanyAdmin || (master.editorRoles ?? []).some((r) => hasRole(r as never));

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [historyRow, setHistoryRow] = useState<Row | null>(null);
  const [approvalRow, setApprovalRow] = useState<Row | null>(null);
  const [deleteRow, setDeleteRow] = useState<Row | null>(null);

  const listCols = useMemo(() => master.fields.filter((f) => f.showInList), [master]);

  const query = useQuery({
    enabled: !!company?.id,
    queryKey: ["master", master.table, company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(master.table as never)
        .select("*")
        .eq("company_id", company!.id)
        .order(master.orderBy ?? "created_at", { ascending: master.orderDir !== "desc" });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const filtered = useMemo(() => {
    const rows = query.data ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      for (const [k, v] of Object.entries(filters)) {
        if (!v) continue;
        if (String(r[k]) !== v) return false;
      }
      if (!term) return true;
      return listCols.some((c) => String(r[c.key] ?? "").toLowerCase().includes(term));
    });
  }, [query.data, search, filters, listCols]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["master", master.table, company?.id] });

  const handleDelete = async () => {
    if (!deleteRow) return;
    const { error } = await supabase.from(master.table as never).delete().eq("id", deleteRow.id);
    if (error) { toast.error(error.message); return; }
    await logAudit("delete", deleteRow);
    setDeleteRow(null);
    invalidate();
    toast.success("Deleted");
  };

  const logAudit = async (action: string, row: Row, metadata: Record<string, unknown> = {}) => {
    try {
      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        company_id: company?.id,
        action: `${master.table}.${action}`,
        entity: master.table,
        entity_id: row.id,
        metadata: { name: row[master.nameField], ...metadata } as never,
      });
    } catch {
      /* non-fatal */
    }
  };

  const exportExcel = () => {
    const exportFields = master.fields.filter((f) => f.showInExport);
    const rows = filtered.map((r) => {
      const out: Record<string, unknown> = {};
      exportFields.forEach((f) => {
        const v = r[f.key];
        out[f.label] = typeof v === "boolean" ? (v ? "Yes" : "No") : v ?? "";
      });
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, master.label.substring(0, 28));
    const filename = `${master.key}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${master.label.toLowerCase()}…`}
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            {(master.filters ?? []).map((f) => (
              <Select
                key={f.key}
                value={filters[f.key] ?? "__all__"}
                onValueChange={(v) => { setFilters({ ...filters, [f.key]: v === "__all__" ? "" : v }); setPage(1); }}
              >
                <SelectTrigger className="w-44"><SelectValue placeholder={f.label} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All {f.label}</SelectItem>
                  {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportExcel}>
                <Download className="h-4 w-4 mr-1.5" /> Export Excel
              </Button>
              {canEdit && (
                <Button size="sm" onClick={() => { setEditingRow(null); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1.5" /> New {master.singular}
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {listCols.map((c) => (
                    <TableHead key={c.key} className={c.colClass}>{c.label}</TableHead>
                  ))}
                  <TableHead className="text-right w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow><TableCell colSpan={listCols.length + 1} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!query.isLoading && pageRows.length === 0 && (
                  <TableRow><TableCell colSpan={listCols.length + 1} className="text-center py-12 text-muted-foreground">No {master.label.toLowerCase()} found</TableCell></TableRow>
                )}
                {pageRows.map((row) => (
                  <TableRow key={row.id}>
                    {listCols.map((c) => (
                      <TableCell key={c.key} className={c.colClass}>{renderCell(c, row)}</TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Audit history" onClick={() => setHistoryRow(row)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Request approval" onClick={() => setApprovalRow(row)}>
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => { setEditingRow(row); setDialogOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => setDeleteRow(row)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-xs text-muted-foreground">Page {page} / {totalPages}</div>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {dialogOpen && (
        <MasterFormDialog
          master={master}
          initial={editingRow}
          onClose={() => setDialogOpen(false)}
          onSaved={async (row, isNew) => {
            setDialogOpen(false);
            await logAudit(isNew ? "create" : "update", row);
            invalidate();
          }}
        />
      )}

      {historyRow && (
        <AuditHistoryDialog
          master={master}
          row={historyRow}
          onClose={() => setHistoryRow(null)}
        />
      )}

      {approvalRow && (
        <ApprovalDialog
          master={master}
          row={approvalRow}
          onClose={() => setApprovalRow(null)}
          onSubmitted={() => setApprovalRow(null)}
        />
      )}

      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {master.singular}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{String(deleteRow?.[master.nameField] ?? "")}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function renderCell(field: FieldDef, row: Row) {
  const v = row[field.key];
  if (field.format) return field.format(v, row);
  if (field.type === "boolean") {
    return v ? (
      <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950 dark:border-emerald-800">
        <CheckCircle2 className="h-3 w-3" /> Yes
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <XCircle className="h-3 w-3" /> No
      </Badge>
    );
  }
  if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
  if (field.type === "date") return String(v).slice(0, 10);
  return String(v);
}

function MasterFormDialog({
  master,
  initial,
  onClose,
  onSaved,
}: {
  master: MasterDef;
  initial: Row | null;
  onClose: () => void;
  onSaved: (row: Row, isNew: boolean) => void;
}) {
  const { company, user } = useAuth();
  const initialForm = useMemo(() => {
    const f: Record<string, unknown> = {};
    master.fields.forEach((fd) => {
      f[fd.key] = initial?.[fd.key] ?? fd.defaultValue ?? (fd.type === "boolean" ? false : fd.type === "number" ? 0 : "");
    });
    return f;
  }, [master, initial]);
  const [form, setForm] = useState<Record<string, unknown>>(initialForm);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async () => {
    for (const f of master.fields) {
      if (f.required && (form[f.key] === "" || form[f.key] === null || form[f.key] === undefined)) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    if (!company?.id) return;
    setSaving(true);
    const payload: Record<string, unknown> = {};
    master.fields.forEach((f) => {
      let v = form[f.key];
      if (f.type === "number") v = v === "" || v === null ? null : Number(v);
      if (f.type === "date") v = v || null;
      if ((f.type === "text" || f.type === "email" || f.type === "phone" || f.type === "textarea") && v === "") v = null;
      payload[f.key] = v;
    });

    let res;
    if (initial) {
      res = await supabase.from(master.table as never).update(payload as never).eq("id", initial.id).select("*").single();
    } else {
      const insertPayload: Record<string, unknown> = { ...payload, company_id: company.id };
      if (master.table === "customers" || master.table === "suppliers") insertPayload.created_by = user?.id;
      res = await supabase.from(master.table as never).insert(insertPayload as never).select("*").single();
    }
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(initial ? "Updated" : "Created");
    onSaved(res.data as unknown as Row, !initial);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${master.singular}` : `New ${master.singular}`}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2 mt-2">
          {master.fields.map((f) => (
            <div key={f.key} className={f.span === 2 ? "sm:col-span-2" : ""}>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {f.label}{f.required && <span className="text-destructive"> *</span>}
              </Label>
              <div className="mt-1.5">
                <FieldInput field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} />
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : initial ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const v = (value ?? "") as string | number | boolean;
  if (field.type === "textarea") {
    return <Textarea rows={3} value={v as string} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
  }
  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-2 h-9">
        <Switch checked={!!v} onCheckedChange={(c) => onChange(c)} />
        <span className="text-sm text-muted-foreground">{v ? "Yes" : "No"}</span>
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <Select value={(v as string) || ""} onValueChange={(val) => onChange(val)}>
        <SelectTrigger><SelectValue placeholder={field.placeholder ?? "Select…"} /></SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  if (field.type === "number") {
    return <Input type="number" step="0.001" value={v as number} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} placeholder={field.placeholder} />;
  }
  if (field.type === "date") {
    return <Input type="date" value={(v as string) ? String(v).slice(0, 10) : ""} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <Input
      type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
      value={v as string}
      onChange={(e) => onChange(field.uppercase ? e.target.value.toUpperCase() : e.target.value)}
      placeholder={field.placeholder}
    />
  );
}

function AuditHistoryDialog({ master, row, onClose }: { master: MasterDef; row: Row; onClose: () => void }) {
  const { company } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["audit", master.table, row.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, created_at, user_id, metadata")
        .eq("company_id", company!.id)
        .eq("entity", master.table)
        .eq("entity_id", row.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Audit history · {String(row[master.nameField] ?? "")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && (data ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">No history yet.</div>
          )}
          {(data ?? []).map((l) => (
            <div key={l.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{l.action}</span>
                <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
              </div>
              {l.metadata && (
                <div className="text-xs text-muted-foreground mt-1 font-mono truncate">{JSON.stringify(l.metadata)}</div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApprovalDialog({ master, row, onClose, onSubmitted }: { master: MasterDef; row: Row; onClose: () => void; onSubmitted: () => void }) {
  const { company, user } = useAuth();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!company?.id) return;
    setSubmitting(true);
    const { error } = await supabase.from("approvals").insert({
      company_id: company.id,
      entity_type: master.table,
      entity_id: row.id,
      rule_name: `${master.singular} approval`,
      status: "pending" as never,
      current_step: 1,
      total_steps: 1,
      requested_by: user?.id,
      notes: notes || null,
    } as never);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Approval request submitted");
    onSubmitted();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request approval</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Submit "{String(row[master.nameField] ?? "")}" for approval.
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Notes</Label>
            <Textarea rows={3} className="mt-1.5" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional reason or context" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}