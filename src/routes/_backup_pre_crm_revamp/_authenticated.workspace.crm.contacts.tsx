import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { RowActions } from "@/components/RowActions";
import { useContacts, useSaveContact, useCustomers, formatDate, type ContactRow } from "@/features/crm/api";

export const Route = createFileRoute("/_authenticated/workspace/crm/contacts")({
  component: ContactsPage,
});

const empty: Partial<ContactRow> = { name: "", title: "", email: "", phone: "", tags: [] };

function ContactsPage() {
  const { data: contacts = [], isLoading } = useContacts();
  const { data: customers = [] } = useCustomers();
  const save = useSaveContact();
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [editing, setEditing] = useState<Partial<ContactRow> | null>(null);

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (customerId && c.customer_id !== customerId) return false;
      if (!term) return true;
      return [c.name, c.email, c.title, c.phone].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [contacts, search, customerId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search contacts…"
            filters={[
              { key: "customer", label: "Account", value: customerId, onChange: setCustomerId, options: customers.map((c) => ({ value: c.id, label: c.name })) },
            ]}
            actions={<Button size="sm" onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1.5" /> New contact</Button>}
          />

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Last contacted</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No contacts yet.</TableCell></TableRow>
                ) : filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.title ?? "—"}</TableCell>
                    <TableCell>{customerName(c.customer_id)}</TableCell>
                    <TableCell className="text-sm">{c.email ?? "—"}</TableCell>
                    <TableCell className="text-sm">{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(c.last_contacted_at)}</TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onEdit={() => setEditing(c)}
                        table="crm_contacts"
                        id={c.id}
                        invalidateKeys={[["crm", "contacts"]]}
                        label="contact"
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
          title={editing.id ? "Edit contact" : "New contact"}
          submitting={save.isPending}
          onSubmit={async () => { await save.mutateAsync(editing); }}
        >
          <Field label="Name *"><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title"><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <Field label="Account">
              <Select value={editing.customer_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, customer_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Email"><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="Last contacted"><Input type="date" value={editing.last_contacted_at?.slice(0, 10) ?? ""} onChange={(e) => setEditing({ ...editing, last_contacted_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
          </div>
        </FormDialog>
      )}
    </div>
  );
}