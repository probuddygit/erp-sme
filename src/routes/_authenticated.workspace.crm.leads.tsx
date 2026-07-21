import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Paperclip, StickyNote, Mail, Phone, Building2 } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { ViewSwitcher, type ViewMode } from "@/features/crm/components/ViewSwitcher";
import { KanbanBoard } from "@/features/crm/components/KanbanBoard";
import { CalendarView } from "@/features/crm/components/CalendarView";
import { StatusBadge, PriorityDot } from "@/features/crm/components/StatusBadge";
import { RecordDrawer, DetailGrid } from "@/features/crm/components/RecordDrawer";
import { LEADS, LEAD_STATUSES, formatINR, formatDate, type Lead } from "@/features/crm/data";

export const Route = createFileRoute("/_authenticated/workspace/crm/leads")({
  component: LeadsPage,
});

const OWNERS = Array.from(new Set(LEADS.map((l) => l.owner)));
const SOURCES = Array.from(new Set(LEADS.map((l) => l.source)));

function LeadsPage() {
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [source, setSource] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return LEADS.filter((l) => {
      if (status && l.status !== status) return false;
      if (owner && l.owner !== owner) return false;
      if (source && l.source !== source) return false;
      if (!term) return true;
      return [l.name, l.company, l.email, l.phone].some((v) => v.toLowerCase().includes(term));
    });
  }, [search, status, owner, source]);

  const columns = LEAD_STATUSES.map((s) => ({
    key: s.key,
    label: s.label,
    tone: s.tone,
    items: filtered.filter((l) => l.status === s.key),
  }));

  const calendarItems = filtered
    .filter((l) => l.nextFollowUp)
    .map((l) => ({ id: l.id, date: l.nextFollowUp!, lead: l }));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search leads by name, company, email…"
            filters={[
              { key: "status", label: "Status", value: status, onChange: setStatus, options: LEAD_STATUSES.map((s) => ({ value: s.key, label: s.label })) },
              { key: "owner", label: "Owner", value: owner, onChange: setOwner, options: OWNERS.map((o) => ({ value: o, label: o })) },
              { key: "source", label: "Source", value: source, onChange: setSource, options: SOURCES.map((s) => ({ value: s, label: s })) },
            ]}
            actions={
              <>
                <ViewSwitcher value={view} onChange={setView} />
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New lead</Button>
              </>
            }
          />

          {view === "table" && (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next follow-up</TableHead>
                    <TableHead className="text-center">Priority</TableHead>
                    <TableHead className="text-center">Files</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">No leads match your filters.</TableCell></TableRow>
                  ) : (
                    filtered.map((l) => {
                      const tone = LEAD_STATUSES.find((s) => s.key === l.status)?.tone;
                      return (
                        <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(l)}>
                          <TableCell>
                            <div className="font-medium">{l.name}</div>
                            <div className="text-xs text-muted-foreground">{l.email}</div>
                          </TableCell>
                          <TableCell>{l.company}</TableCell>
                          <TableCell>{l.owner}</TableCell>
                          <TableCell><span className="text-xs text-muted-foreground">{l.source}</span></TableCell>
                          <TableCell className="text-right font-medium">{formatINR(l.value)}</TableCell>
                          <TableCell><StatusBadge label={LEAD_STATUSES.find((s) => s.key === l.status)!.label} tone={tone} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{l.nextFollowUp ? formatDate(l.nextFollowUp) : "—"}</TableCell>
                          <TableCell className="text-center"><PriorityDot priority={l.priority} /></TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{l.attachments.length}</span>
                              <span className="inline-flex items-center gap-0.5"><StickyNote className="h-3 w-3" />{l.notes.length}</span>
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {view === "kanban" && (
            <KanbanBoard
              columns={columns}
              getKey={(l) => l.id}
              summary={(items) => formatINR(items.reduce((s, l) => s + l.value, 0))}
              renderCard={(l) => (
                <button type="button" onClick={() => setSelected(l)} className="block w-full text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{l.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{l.company}</div>
                    </div>
                    <PriorityDot priority={l.priority} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-medium">{formatINR(l.value)}</span>
                    <span className="text-muted-foreground">{l.owner.split(" ")[0]}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" />{l.attachments.length}</span>
                    <span className="inline-flex items-center gap-1"><StickyNote className="h-3 w-3" />{l.notes.length}</span>
                    {l.nextFollowUp && <span className="ml-auto">↻ {formatDate(l.nextFollowUp)}</span>}
                  </div>
                </button>
              )}
            />
          )}

          {view === "calendar" && (
            <CalendarView
              items={calendarItems}
              renderItem={(it) => (
                <button type="button" onClick={() => setSelected(it.lead)} className="block w-full truncate rounded bg-primary/10 px-1.5 py-0.5 text-left text-[11px] text-primary hover:bg-primary/20">
                  {it.lead.name}
                </button>
              )}
            />
          )}
        </CardContent>
      </Card>

      <RecordDrawer
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={selected ? `${selected.company} · ${selected.id}` : ""}
        notes={selected?.notes}
        attachments={selected?.attachments}
        timeline={selected ? [
          { id: "t1", label: "Lead created", when: selected.createdAt },
          ...(selected.nextFollowUp ? [{ id: "t2", label: "Follow-up scheduled", when: selected.nextFollowUp }] : []),
        ] : []}
        details={
          selected ? (
            <DetailGrid
              items={[
                { label: "Company", value: <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{selected.company}</span> },
                { label: "Email",   value: <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{selected.email}</span> },
                { label: "Phone",   value: <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{selected.phone}</span> },
                { label: "Owner",   value: selected.owner },
                { label: "Source",  value: selected.source },
                { label: "Value",   value: formatINR(selected.value) },
                { label: "Status",  value: <StatusBadge label={LEAD_STATUSES.find((s) => s.key === selected.status)!.label} tone={LEAD_STATUSES.find((s) => s.key === selected.status)?.tone} /> },
                { label: "Priority",value: <span className="inline-flex items-center gap-1.5"><PriorityDot priority={selected.priority} /> {selected.priority}</span> },
              ]}
            />
          ) : null
        }
      />
    </div>
  );
}