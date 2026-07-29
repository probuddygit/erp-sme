import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Star, MessageCircle } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { RowActions } from "@/components/RowActions";
import { useContacts, useSaveContact, useAccounts, formatDate, type ContactRow } from "@/features/crm/api";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/workspace/crm/contacts")({
  component: ContactsPage,
});

const empty: Partial<ContactRow> = { name: "", title: "", designation: "", email: "", phone: "", tags: [], is_primary: false, whatsapp_opt_in: false };

function ContactsPage() {
  const { data: contacts = [], isLoading } = useContacts();
  const { data: accounts = [] } = useAccounts();
  const save = useSaveContact();
  const [search, setSearch] = useState("");
  const [accountId, setAccountId] = useState("");
  const [editing, setEditing] = useState<Partial<ContactRow> | null>(null);

  const accountName = (id: string | null) => accounts.find((c) => c.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (accountId && c.account_id !== accountId) return false;
      if (!term) return true;
      return [c.name, c.email, c.title, c.designation, c.phone].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [contacts, search, accountId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search contacts…"
            filters={[
              { key: "account", label: "Account", value: accountId, onChange: setAccountId, options: accounts.map((c) => ({ value: c.id, label: c.name })) },
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
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {c.is_primary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-label="Primary" />}
                        {c.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.designation ?? c.title ?? "—"}</TableCell>
                    <TableCell>{accountName(c.account_id)}</TableCell>
                    <TableCell className="text-sm">{c.email ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        {c.phone ?? "—"}
                        {c.whatsapp_opt_in && c.phone && <MessageCircle className="h-3 w-3 text-emerald-600" aria-label="WhatsApp OK" />}
                      </span>
                    </TableCell>
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
            <Field label="First name"><Input value={editing.first_name ?? ""} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} /></Field>
            <Field label="Last name"><Input value={editing.last_name ?? ""} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} /></Field>
            <Field label="Designation"><Input value={editing.designation ?? ""} onChange={(e) => setEditing({ ...editing, designation: e.target.value })} placeholder="e.g. Head of Procurement" /></Field>
            <Field label="Account">
              <Select value={editing.account_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, account_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {accounts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Email"><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="Last contacted"><Input type="date" value={editing.last_contacted_at?.slice(0, 10) ?? ""} onChange={(e) => setEditing({ ...editing, last_contacted_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
          </div>
          <div className="flex flex-wrap gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!editing.is_primary} onCheckedChange={(v) => setEditing({ ...editing, is_primary: !!v })} />
              Primary contact
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!editing.whatsapp_opt_in} onCheckedChange={(v) => setEditing({ ...editing, whatsapp_opt_in: !!v })} />
              WhatsApp opt-in
            </label>
          </div>
        </FormDialog>
      )}
    </div>
  );
}