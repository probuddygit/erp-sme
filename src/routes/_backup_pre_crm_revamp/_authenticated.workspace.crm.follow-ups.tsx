import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { ViewSwitcher, type ViewMode } from "@/features/crm/components/ViewSwitcher";
import { CalendarView } from "@/features/crm/components/CalendarView";
import { PriorityDot, StatusBadge } from "@/features/crm/components/StatusBadge";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { RowActions } from "@/components/RowActions";
import { useFollowUps, useSaveFollowUp, useToggleFollowUp, useLeads, formatDate, type FollowUpRow } from "@/features/crm/api";

export const Route = createFileRoute("/_authenticated/workspace/crm/follow-ups")({
  component: FollowUpsPage,
});

const empty: Partial<FollowUpRow> = { subject: "", due_date: new Date().toISOString().slice(0, 10), priority: "medium", done: false };

function FollowUpsPage() {
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [editing, setEditing] = useState<Partial<FollowUpRow> | null>(null);
  const { data: rows = [], isLoading } = useFollowUps();
  const { data: leads = [] } = useLeads();
  const save = useSaveFollowUp();
  const toggle = useToggleFollowUp();

  const leadTitle = (id: string | null) => leads.find((l) => l.id === id)?.title ?? "—";

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((f) => {
      if (priority && f.priority !== priority) return false;
      if (!term) return true;
      return [f.subject, leadTitle(f.lead_id)].some((v) => (v ?? "").toLowerCase().includes(term));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, priority, leads]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search follow-ups…"
            filters={[
              { key: "priority", label: "Priority", value: priority, onChange: setPriority, options: [
                { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" },
              ] },
            ]}
            actions={
              <>
                <ViewSwitcher value={view} onChange={setView} available={["table", "calendar"]} />
                <Button size="sm" onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1.5" /> New follow-up</Button>
              </>
            }
          />

          {view === "table" && (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-center">Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No follow-ups yet.</TableCell></TableRow>
                  ) : filtered.map((f) => {
                    const overdue = !f.done && new Date(f.due_date) < new Date();
                    return (
                      <TableRow key={f.id} className="hover:bg-muted/50">
                        <TableCell><Checkbox checked={f.done} onCheckedChange={(v) => toggle.mutate({ id: f.id, done: !!v })} /></TableCell>
                        <TableCell className={f.done ? "text-muted-foreground line-through" : "font-medium"}>{f.subject}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{leadTitle(f.lead_id)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(f.due_date)}</TableCell>
                        <TableCell className="text-center"><span className="inline-flex items-center gap-1.5 text-xs"><PriorityDot priority={f.priority} />{f.priority}</span></TableCell>
                        <TableCell>
                          <StatusBadge
                            label={f.done ? "Done" : overdue ? "Overdue" : "Pending"}
                            tone={f.done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : overdue ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-blue-50 text-blue-700 border-blue-200"}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <RowActions
                            onEdit={() => setEditing(f)}
                            table="crm_follow_ups"
                            id={f.id}
                            invalidateKeys={[["crm", "follow_ups"]]}
                            label="follow-up"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {view === "calendar" && (
            <CalendarView
              items={filtered.map((f) => ({ id: f.id, date: f.due_date, fu: f }))}
              renderItem={(it) => (
                <div className={`truncate rounded px-1.5 py-0.5 text-[11px] ${it.fu.done ? "bg-emerald-100 text-emerald-800" : "bg-primary/10 text-primary"}`}>
                  {it.fu.subject}
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      {editing && (
        <FormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing.id ? "Edit follow-up" : "New follow-up"}
          submitting={save.isPending}
          onSubmit={async () => { await save.mutateAsync(editing); }}
        >
          <Field label="Subject *"><Input value={editing.subject ?? ""} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lead">
              <Select value={editing.lead_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, lead_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={editing.priority ?? "medium"} onValueChange={(v) => setEditing({ ...editing, priority: v as FollowUpRow["priority"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Due date *"><Input type="date" required value={editing.due_date ?? ""} onChange={(e) => setEditing({ ...editing, due_date: e.target.value })} /></Field>
          </div>
        </FormDialog>
      )}
    </div>
  );
}