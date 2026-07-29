import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { RowActions } from "@/components/RowActions";
import { useCustomers, useSaveCustomer, type CustomerRow } from "@/features/crm/api";

export const Route = createFileRoute("/_authenticated/workspace/crm/accounts")({
  component: AccountsPage,
});

const empty: Partial<CustomerRow> = { name: "", contact_person: "", email: "", phone: "", gst_number: "", billing_address: "", state_code: "", is_active: true };

function AccountsPage() {
  const { data: rows = [], isLoading } = useCustomers();
  const save = useSaveCustomer();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Partial<CustomerRow> | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((a) => {
      if (status === "active" && !a.is_active) return false;
      if (status === "inactive" && a.is_active) return false;
      if (!term) return true;
      return [a.name, a.contact_person, a.email, a.gst_number].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [rows, search, status]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search accounts…"
            filters={[
              { key: "status", label: "Status", value: status, onChange: setStatus, options: [
                { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" },
              ] },
            ]}
            actions={<Button size="sm" onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1.5" /> New account</Button>}
          />
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No accounts yet.</TableCell></TableRow>
                ) : filtered.map((a) => (
                  <TableRow key={a.id} className="hover:bg-muted/50">
                    <TableCell><div className="font-medium">{a.name}</div></TableCell>
                    <TableCell className="text-sm">{a.contact_person ?? "—"}</TableCell>
                    <TableCell className="text-sm">{a.email ?? "—"}</TableCell>
                    <TableCell className="text-xs">{a.gst_number ?? "—"}</TableCell>
                    <TableCell className="text-xs">{a.state_code ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge label={a.is_active ? "Active" : "Inactive"}
                        tone={a.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onEdit={() => setEditing(a)}
                        table="customers"
                        id={a.id}
                        invalidateKeys={[["crm", "customers"]]}
                        label="account"
                      />
                    </TableCell>
                  </TableRow>
                ))}
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
          onSubmit={async () => { await save.mutateAsync(editing); }}
        >
          <Field label="Name *"><Input required value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact person"><Input value={editing.contact_person ?? ""} onChange={(e) => setEditing({ ...editing, contact_person: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="GSTIN"><Input value={editing.gst_number ?? ""} onChange={(e) => setEditing({ ...editing, gst_number: e.target.value })} /></Field>
            <Field label="State code"><Input maxLength={2} value={editing.state_code ?? ""} onChange={(e) => setEditing({ ...editing, state_code: e.target.value })} /></Field>
          </div>
          <Field label="Billing address"><Textarea rows={2} value={editing.billing_address ?? ""} onChange={(e) => setEditing({ ...editing, billing_address: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> Active</label>
        </FormDialog>
      )}
    </div>
  );
}