import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Phone, Mail, ListChecks, CalendarDays, StickyNote, type LucideIcon } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { ViewSwitcher, type ViewMode } from "@/features/crm/components/ViewSwitcher";
import { CalendarView } from "@/features/crm/components/CalendarView";
import { KanbanBoard } from "@/features/crm/components/KanbanBoard";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { ACTIVITIES, formatDateTime, type Activity, type ActivityType } from "@/features/crm/data";

export const Route = createFileRoute("/_authenticated/workspace/crm/activities")({
  component: ActivitiesPage,
});

const TYPE_ICON: Record<ActivityType, LucideIcon> = {
  call: Phone, email: Mail, meeting: CalendarDays, task: ListChecks, note: StickyNote,
};
const TYPE_OPTIONS = [
  { value: "call", label: "Call" }, { value: "meeting", label: "Meeting" },
  { value: "email", label: "Email" }, { value: "task", label: "Task" }, { value: "note", label: "Note" },
];
const STATUS_TONE: Record<Activity["status"], string> = {
  planned: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
};
const OWNER_OPTIONS = Array.from(new Set(ACTIVITIES.map((a) => a.owner))).map((o) => ({ value: o, label: o }));

function ActivitiesPage() {
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ACTIVITIES.filter((a) => {
      if (type && a.type !== type) return false;
      if (status && a.status !== status) return false;
      if (owner && a.owner !== owner) return false;
      if (!term) return true;
      return [a.subject, a.related, a.owner].some((v) => v.toLowerCase().includes(term));
    });
  }, [search, type, status, owner]);

  const columns = (["planned", "done", "overdue"] as const).map((s) => ({
    key: s, label: s.charAt(0).toUpperCase() + s.slice(1), tone: STATUS_TONE[s],
    items: filtered.filter((a) => a.status === s),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search activities…"
            filters={[
              { key: "type", label: "Type", value: type, onChange: setType, options: TYPE_OPTIONS },
              { key: "status", label: "Status", value: status, onChange: setStatus, options: [
                { value: "planned", label: "Planned" }, { value: "done", label: "Done" }, { value: "overdue", label: "Overdue" },
              ] },
              { key: "owner", label: "Owner", value: owner, onChange: setOwner, options: OWNER_OPTIONS },
            ]}
            actions={
              <>
                <ViewSwitcher value={view} onChange={setView} />
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New activity</Button>
              </>
            }
          />

          {view === "table" && (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Related</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No activities found.</TableCell></TableRow>
                  ) : filtered.map((a) => {
                    const Icon = TYPE_ICON[a.type];
                    return (
                      <TableRow key={a.id} className="hover:bg-muted/50">
                        <TableCell><span className="inline-flex items-center gap-1.5 text-xs"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{a.type}</span></TableCell>
                        <TableCell className="font-medium">{a.subject}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.related}</TableCell>
                        <TableCell>{a.owner}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(a.when)}</TableCell>
                        <TableCell><StatusBadge label={a.status} tone={STATUS_TONE[a.status]} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {view === "kanban" && (
            <KanbanBoard
              columns={columns}
              getKey={(a) => a.id}
              renderCard={(a) => {
                const Icon = TYPE_ICON[a.type];
                return (
                  <div>
                    <div className="flex items-start gap-2">
                      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{a.subject}</div>
                        <div className="text-xs text-muted-foreground">{a.related} · {a.owner.split(" ")[0]}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">{formatDateTime(a.when)}</div>
                  </div>
                );
              }}
            />
          )}

          {view === "calendar" && (
            <CalendarView
              items={filtered.map((a) => ({ id: a.id, date: a.when, activity: a }))}
              renderItem={(it) => {
                const Icon = TYPE_ICON[it.activity.type];
                return (
                  <div className="flex items-center gap-1 truncate rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{it.activity.subject}</span>
                  </div>
                );
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}