import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Mail, Phone } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { RecordDrawer, DetailGrid } from "@/features/crm/components/RecordDrawer";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { CONTACTS, formatDate, type Contact } from "@/features/crm/data";

export const Route = createFileRoute("/_authenticated/workspace/crm/contacts")({
  component: ContactsPage,
});

const ACCOUNT_OPTIONS = Array.from(new Set(CONTACTS.map((c) => c.account))).map((a) => ({ value: a, label: a }));
const OWNER_OPTIONS = Array.from(new Set(CONTACTS.map((c) => c.owner))).map((o) => ({ value: o, label: o }));

function ContactsPage() {
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState("");
  const [owner, setOwner] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return CONTACTS.filter((c) => {
      if (account && c.account !== account) return false;
      if (owner && c.owner !== owner) return false;
      if (!term) return true;
      return [c.name, c.email, c.title, c.account].some((v) => v.toLowerCase().includes(term));
    });
  }, [search, account, owner]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search contacts…"
            filters={[
              { key: "account", label: "Account", value: account, onChange: setAccount, options: ACCOUNT_OPTIONS },
              { key: "owner", label: "Owner", value: owner, onChange: setOwner, options: OWNER_OPTIONS },
            ]}
            actions={<Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New contact</Button>}
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
                  <TableHead>Owner</TableHead>
                  <TableHead>Last contacted</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No contacts found.</TableCell></TableRow>
                ) : filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(c)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.title}</TableCell>
                    <TableCell>{c.account}</TableCell>
                    <TableCell className="text-sm">{c.email}</TableCell>
                    <TableCell className="text-sm">{c.phone}</TableCell>
                    <TableCell>{c.owner}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(c.lastContacted)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.tags.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : c.tags.map((t) => (
                          <StatusBadge key={t} label={t} tone={t === "vip" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"} />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RecordDrawer
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={selected ? `${selected.title} · ${selected.account}` : ""}
        details={
          selected ? (
            <DetailGrid items={[
              { label: "Email",  value: <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{selected.email}</span> },
              { label: "Phone",  value: <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{selected.phone}</span> },
              { label: "Account",value: selected.account },
              { label: "Owner",  value: selected.owner },
              { label: "Last contacted", value: formatDate(selected.lastContacted) },
              { label: "Tags",   value: selected.tags.join(", ") || "—" },
            ]} />
          ) : null
        }
      />
    </div>
  );
}