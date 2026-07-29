import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Building2, ShieldCheck, ShieldAlert, ChevronRight } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { RowActions } from "@/components/RowActions";
import { useAccounts, useSaveAccount, validateGstinFormat, formatINR, type AccountRow } from "@/features/crm/api";

export const Route = createFileRoute("/_authenticated/workspace/crm/accounts")({
  component: AccountsPage,
});

const empty: Partial<AccountRow> = {
  name: "", gstin: "", pan: "", billing_address: "", shipping_address: "",
  credit_limit: 0, credit_days: 30, territory: "", status: "active",
};

function AccountsPage() {
  const { data: rows = [], isLoading } = useAccounts();
  const save = useSaveAccount();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Partial<AccountRow> | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((a) => {
      if (status && a.status !== status) return false;
      if (!term) return true;
      return [a.name, a.gstin, a.territory].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [rows, search, status]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search accounts by name, GSTIN, territory…"
            filters={[
              { key: "status", label: "Status", value: status, onChange: setStatus, options: [
                { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "on_hold", label: "On hold" },
              ] },
            ]}
            actions={<Button size="sm" onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1.5" /> New account</Button>}
          />
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead className="text-right">Credit limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No accounts yet. Convert a lead or create one.</TableCell></TableRow>
                ) : filtered.map((a) => {
                  const ok = validateGstinFormat(a.gstin);
                  return (
                    <TableRow key={a.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Link to="/workspace/crm/accounts/$accountId" params={{ accountId: a.id }} className="group inline-flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          <span className="font-medium group-hover:text-primary">{a.name}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">
                        {a.gstin ? (
                          <span className="inline-flex items-center gap-1">
                            {a.gstin}
                            {ok
                              ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                              : <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{a.territory ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm">{formatINR(a.credit_limit)}</TableCell>
                      <TableCell>
                        <StatusBadge label={a.status} tone={a.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          onEdit={() => setEditing(a)}
                          table="crm_accounts"
                          id={a.id}
                          invalidateKeys={[["crm", "accounts_v2"]]}
                          label="account"
                        />
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
          title={editing.id ? "Edit account" : "New account"}
          submitting={save.isPending}
          onSubmit={async () => {
            const payload: Partial<AccountRow> = { ...editing };
            if (payload.gstin) payload.gstin = payload.gstin.trim().toUpperCase();
            payload.gstin_verified_at = validateGstinFormat(payload.gstin) ? new Date().toISOString() : null;
            await save.mutateAsync(payload);
          }}
        >
          <Field label="Name *"><Input required value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="GSTIN">
              <Input value={editing.gstin ?? ""} onChange={(e) => setEditing({ ...editing, gstin: e.target.value.toUpperCase() })} placeholder="27ABCDE1234F1Z5" />
              {editing.gstin && !validateGstinFormat(editing.gstin) && <span className="mt-1 block text-[11px] text-amber-700">Invalid GSTIN format — will save unverified.</span>}
            </Field>
            <Field label="PAN"><Input value={editing.pan ?? ""} onChange={(e) => setEditing({ ...editing, pan: e.target.value.toUpperCase() })} /></Field>
            <Field label="Territory"><Input value={editing.territory ?? ""} onChange={(e) => setEditing({ ...editing, territory: e.target.value })} /></Field>
            <Field label="Status">
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={editing.status ?? "active"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_hold">On hold</option>
              </select>
            </Field>
            <Field label="Credit limit (₹)"><Input type="number" value={editing.credit_limit ?? 0} onChange={(e) => setEditing({ ...editing, credit_limit: Number(e.target.value) })} /></Field>
            <Field label="Credit days"><Input type="number" value={editing.credit_days ?? 0} onChange={(e) => setEditing({ ...editing, credit_days: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Billing address"><Textarea rows={2} value={editing.billing_address ?? ""} onChange={(e) => setEditing({ ...editing, billing_address: e.target.value })} /></Field>
          <Field label="Shipping address"><Textarea rows={2} value={editing.shipping_address ?? ""} onChange={(e) => setEditing({ ...editing, shipping_address: e.target.value })} /></Field>
        </FormDialog>
      )}
    </div>
  );
}