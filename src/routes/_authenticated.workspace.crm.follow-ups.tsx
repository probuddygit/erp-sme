import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { ViewSwitcher, type ViewMode } from "@/features/crm/components/ViewSwitcher";
import { CalendarView } from "@/features/crm/components/CalendarView";
import { PriorityDot, StatusBadge } from "@/features/crm/components/StatusBadge";
import { FOLLOW_UPS, formatDate, type FollowUp } from "@/features/crm/data";

export const Route = createFileRoute("/_authenticated/workspace/crm/follow-ups")({
  component: FollowUpsPage,
});

const OWNER_OPTIONS = Array.from(new Set(FOLLOW_UPS.map((f) => f.owner))).map((v) => ({ value: v, label: v }));

function FollowUpsPage() {
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [owner, setOwner] = useState("");
  const [items, setItems] = useState<FollowUp[]>(FOLLOW_UPS);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((f) => {
      if (priority && f.priority !== priority) return false;
      if (owner && f.owner !== owner) return false;
      if (!term) return true;
      return [f.subject, f.lead, f.owner].some((v) => v.toLowerCase().includes(term));
    });
  }, [items, search, priority, owner]);

  const toggle = (id: string) =>
    setItems((prev) => prev.map((f) => (f.id === id ? { ...f, done: !f.done } : f)));

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
              { key: "owner", label: "Owner", value: owner, onChange: setOwner, options: OWNER_OPTIONS },
            ]}
            actions={
              <>
                <ViewSwitcher value={view} onChange={setView} available={["table", "calendar"]} />
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New follow-up</Button>
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
                    <TableHead>Owner</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-center">Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f) => {
                    const overdue = !f.done && new Date(f.dueDate) < new Date();
                    return (
                      <TableRow key={f.id} className="hover:bg-muted/50">
                        <TableCell><Checkbox checked={f.done} onCheckedChange={() => toggle(f.id)} /></TableCell>
                        <TableCell className={f.done ? "text-muted-foreground line-through" : "font-medium"}>{f.subject}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.lead}</TableCell>
                        <TableCell>{f.owner}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(f.dueDate)}</TableCell>
                        <TableCell className="text-center"><span className="inline-flex items-center gap-1.5 text-xs"><PriorityDot priority={f.priority} />{f.priority}</span></TableCell>
                        <TableCell>
                          <StatusBadge
                            label={f.done ? "Done" : overdue ? "Overdue" : "Pending"}
                            tone={f.done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : overdue ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-blue-50 text-blue-700 border-blue-200"}
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
              items={filtered.map((f) => ({ id: f.id, date: f.dueDate, fu: f }))}
              renderItem={(it) => (
                <div className={`truncate rounded px-1.5 py-0.5 text-[11px] ${it.fu.done ? "bg-emerald-100 text-emerald-800" : "bg-primary/10 text-primary"}`}>
                  {it.fu.subject}
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}