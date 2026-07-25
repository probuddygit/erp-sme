import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Phone, Mail, ListChecks, CalendarDays, StickyNote, Loader2, type LucideIcon } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { RowActions } from "@/components/RowActions";
import { useActivities, useSaveActivity, formatDateTime, type ActivityRow } from "@/features/crm/api";

export const Route = createFileRoute("/_authenticated/workspace/crm/activities")({
  component: ActivitiesPage,
});

const TYPE_ICON: Record<ActivityRow["activity_type"], LucideIcon> = {
  call: Phone, email: Mail, meeting: CalendarDays, task: ListChecks, note: StickyNote,
};
const TYPES: ActivityRow["activity_type"][] = ["call", "meeting", "email", "task", "note"];
const STATUSES: ActivityRow["status"][] = ["planned", "done", "overdue"];
const STATUS_TONE: Record<ActivityRow["status"], string> = {
  planned: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
};

const empty: Partial<ActivityRow> = { activity_type: "task", subject: "", scheduled_at: new Date().toISOString(), status: "planned" };

function ActivitiesPage() {
  const { data: rows = [], isLoading } = useActivities();
  const save = useSaveActivity();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Partial<ActivityRow> | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((a) => {
      if (type && a.activity_type !== type) return false;
      if (status && a.status !== status) return false;
      if (!term) return true;
      return [a.subject, a.notes].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [rows, search, type, status]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search activities…"
            filters={[
              { key: "type", label: "Type", value: type, onChange: setType, options: TYPES.map((t) => ({ value: t, label: t })) },
              { key: "status", label: "Status", value: status, onChange: setStatus, options: STATUSES.map((s) => ({ value: s, label: s })) },
            ]}
            actions={<Button size="sm" onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1.5" /> New activity</Button>}
          />

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No activities yet.</TableCell></TableRow>
                ) : filtered.map((a) => {
                  const Icon = TYPE_ICON[a.activity_type];
                  return (
                    <TableRow key={a.id} className="hover:bg-muted/50">
                      <TableCell><span className="inline-flex items-center gap-1.5 text-xs capitalize"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{a.activity_type}</span></TableCell>
                      <TableCell className="font-medium">{a.subject}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(a.scheduled_at)}</TableCell>
                      <TableCell><StatusBadge label={a.status} tone={STATUS_TONE[a.status]} /></TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          onEdit={() => setEditing(a)}
                          table="crm_activities"
                          id={a.id}
                          invalidateKeys={[["crm", "activities"]]}
                          label="activity"
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
          title={editing.id ? "Edit activity" : "New activity"}
          submitting={save.isPending}
          onSubmit={async () => { await save.mutateAsync(editing); }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={editing.activity_type ?? "task"} onValueChange={(v) => setEditing({ ...editing, activity_type: v as ActivityRow["activity_type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={editing.status ?? "planned"} onValueChange={(v) => setEditing({ ...editing, status: v as ActivityRow["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Subject *"><Input required value={editing.subject ?? ""} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} /></Field>
          <Field label="Scheduled at"><Input type="datetime-local" value={editing.scheduled_at ? editing.scheduled_at.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString() })} /></Field>
          <Field label="Notes"><Textarea rows={3} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
        </FormDialog>
      )}
    </div>
  );
}