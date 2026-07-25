import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, Mail, MailOpen, Plus, Loader2, Trash2 } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { RowActions } from "@/components/RowActions";
import { useEmails, useSaveEmail, formatDateTime, type EmailRow } from "@/features/crm/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/crm/email-history")({
  component: EmailHistoryPage,
});

const empty: Partial<EmailRow> = { direction: "outbound", subject: "", from_addr: "", to_addr: "", preview: "", sent_at: new Date().toISOString(), opened: false };

function EmailHistoryPage() {
  const { data: emails = [], isLoading } = useEmails();
  const save = useSaveEmail();
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("");
  const [selected, setSelected] = useState<EmailRow | null>(null);
  const [editing, setEditing] = useState<Partial<EmailRow> | null>(null);

  useEffect(() => {
    if (!selected && emails[0]) setSelected(emails[0]);
  }, [emails, selected]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return emails.filter((e) => {
      if (direction && e.direction !== direction) return false;
      if (!term) return true;
      return [e.subject, e.from_addr, e.to_addr, e.preview].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [emails, search, direction]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search email history…"
            filters={[
              { key: "direction", label: "Direction", value: direction, onChange: setDirection, options: [
                { value: "inbound", label: "Inbound" }, { value: "outbound", label: "Outbound" },
              ] },
            ]}
            actions={<Button size="sm" onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1.5" /> Compose</Button>}
          />

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="rounded-lg border border-border divide-y divide-border max-h-[520px] overflow-y-auto">
              {isLoading ? (
                <div className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">No emails yet.</div>
              ) : filtered.map((e) => {
                const active = selected?.id === e.id;
                return (
                  <button type="button" key={e.id} onClick={() => setSelected(e)}
                    className={cn("block w-full px-3 py-2.5 text-left transition-colors", active ? "bg-primary/5" : "hover:bg-muted/50")}>
                    <div className="flex items-center gap-2">
                      {e.direction === "inbound"
                        ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                        : <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />}
                      <span className={cn("truncate text-sm", !e.opened && "font-semibold")}>{e.subject}</span>
                      {!e.opened && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {e.direction === "inbound" ? e.from_addr : `To: ${e.to_addr}`}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate">{e.preview}</span>
                      <span className="ml-2 shrink-0">{formatDateTime(e.sent_at)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-border p-4">
              {selected ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        {selected.opened ? <MailOpen className="h-5 w-5 text-muted-foreground" /> : <Mail className="h-5 w-5 text-primary" />}
                        {selected.subject}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{selected.from_addr}</span> → {selected.to_addr}
                      </div>
                    </div>
                    <StatusBadge label={selected.direction}
                      tone={selected.direction === "inbound" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"} />
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(selected.sent_at)}</div>
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {selected.body || selected.preview || "—"}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing({ ...selected, id: undefined, direction: "outbound", subject: `Re: ${selected.subject}`, to_addr: selected.from_addr, from_addr: selected.to_addr, body: "", preview: "" })}>Reply</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(selected)}>Edit</Button>
                    <RowActions
                      table="crm_email_history"
                      id={selected.id}
                      invalidateKeys={[["crm", "emails"]]}
                      label="email"
                      canEdit={false}
                      onDelete={async () => { setSelected(null); }}
                    />
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground"><Trash2 className="hidden" />Select an email to preview.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <FormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing.id ? "Edit email" : "Compose email"}
          submitting={save.isPending}
          onSubmit={async () => { await save.mutateAsync(editing); }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Direction">
              <Select value={editing.direction ?? "outbound"} onValueChange={(v) => setEditing({ ...editing, direction: v as EmailRow["direction"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sent at"><Input type="datetime-local" value={editing.sent_at ? editing.sent_at.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, sent_at: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString() })} /></Field>
          </div>
          <Field label="Subject *"><Input required value={editing.subject ?? ""} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From *"><Input required type="email" value={editing.from_addr ?? ""} onChange={(e) => setEditing({ ...editing, from_addr: e.target.value })} /></Field>
            <Field label="To *"><Input required type="email" value={editing.to_addr ?? ""} onChange={(e) => setEditing({ ...editing, to_addr: e.target.value })} /></Field>
          </div>
          <Field label="Body"><Textarea rows={5} value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value, preview: e.target.value.slice(0, 120) })} /></Field>
        </FormDialog>
      )}
    </div>
  );
}