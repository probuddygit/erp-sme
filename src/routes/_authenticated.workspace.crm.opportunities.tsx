import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { ViewSwitcher, type ViewMode } from "@/features/crm/components/ViewSwitcher";
import { KanbanBoard } from "@/features/crm/components/KanbanBoard";
import { CalendarView } from "@/features/crm/components/CalendarView";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { OPPORTUNITIES, OPP_STAGES, formatINR, formatDate } from "@/features/crm/data";

export const Route = createFileRoute("/_authenticated/workspace/crm/opportunities")({
  component: OpportunitiesPage,
});

const OWNER_OPTIONS = Array.from(new Set(OPPORTUNITIES.map((o) => o.owner))).map((v) => ({ value: v, label: v }));
const STAGE_OPTIONS = OPP_STAGES.map((s) => ({ value: s.key, label: s.label }));

function OpportunitiesPage() {
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [owner, setOwner] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return OPPORTUNITIES.filter((o) => {
      if (stage && o.stage !== stage) return false;
      if (owner && o.owner !== owner) return false;
      if (!term) return true;
      return [o.name, o.account, o.owner].some((v) => v.toLowerCase().includes(term));
    });
  }, [search, stage, owner]);

  const columns = OPP_STAGES.map((s) => ({
    key: s.key, label: s.label, tone: s.tone,
    items: filtered.filter((o) => o.stage === s.key),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search opportunities…"
            filters={[
              { key: "stage", label: "Stage", value: stage, onChange: setStage, options: STAGE_OPTIONS },
              { key: "owner", label: "Owner", value: owner, onChange: setOwner, options: OWNER_OPTIONS },
            ]}
            actions={
              <>
                <ViewSwitcher value={view} onChange={setView} />
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New opportunity</Button>
              </>
            }
          />

          {view === "kanban" && (
            <KanbanBoard
              columns={columns}
              getKey={(o) => o.id}
              summary={(items) => formatINR(items.reduce((s, o) => s + o.value, 0))}
              renderCard={(o) => (
                <div>
                  <div className="truncate text-sm font-medium">{o.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{o.account}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-medium">{formatINR(o.value)}</span>
                    <span className="text-muted-foreground">{o.probability}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${o.probability}%` }} />
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">Close: {formatDate(o.closeDate)}</div>
                </div>
              )}
            />
          )}

          {view === "table" && (
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opportunity</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Probability</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Close date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No opportunities found.</TableCell></TableRow>
                  ) : filtered.map((o) => {
                    const tone = OPP_STAGES.find((s) => s.key === o.stage)?.tone;
                    return (
                      <TableRow key={o.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{o.name}</TableCell>
                        <TableCell>{o.account}</TableCell>
                        <TableCell><StatusBadge label={OPP_STAGES.find((s) => s.key === o.stage)!.label} tone={tone} /></TableCell>
                        <TableCell className="text-right font-medium">{formatINR(o.value)}</TableCell>
                        <TableCell className="text-right text-sm">{o.probability}%</TableCell>
                        <TableCell>{o.owner}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(o.closeDate)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {view === "calendar" && (
            <CalendarView
              items={filtered.map((o) => ({ id: o.id, date: o.closeDate, opp: o }))}
              renderItem={(it) => (
                <div className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                  {it.opp.name}
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}