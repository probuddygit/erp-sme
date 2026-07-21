import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { KanbanBoard } from "@/features/crm/components/KanbanBoard";
import { PriorityDot, StatusBadge } from "@/features/crm/components/StatusBadge";
import { LEADS, LEAD_STATUSES, formatINR, formatDate } from "@/features/crm/data";

export const Route = createFileRoute("/_authenticated/workspace/crm/pipeline")({
  component: LeadPipelinePage,
});

function LeadPipelinePage() {
  const columns = LEAD_STATUSES.map((s) => ({
    key: s.key, label: s.label, tone: s.tone,
    items: LEADS.filter((l) => l.status === s.key),
  }));

  const totalValue = LEADS.reduce((sum, l) => sum + l.value, 0);
  const wonValue = LEADS.filter((l) => l.status === "won").reduce((s, l) => s + l.value, 0);
  const winRate = LEADS.length > 0 ? Math.round((LEADS.filter((l) => l.status === "won").length / LEADS.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Pipeline value</div>
          <div className="mt-2 text-2xl font-semibold">{formatINR(totalValue)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Won value</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600">{formatINR(wonValue)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Win rate</div>
          <div className="mt-2 text-2xl font-semibold">{winRate}%</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <KanbanBoard
            columns={columns}
            getKey={(l) => l.id}
            summary={(items) => formatINR(items.reduce((s, l) => s + l.value, 0))}
            renderCard={(l) => {
              const tone = LEAD_STATUSES.find((s) => s.key === l.status)?.tone;
              return (
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{l.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{l.company}</div>
                    </div>
                    <PriorityDot priority={l.priority} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-medium">{formatINR(l.value)}</span>
                    <StatusBadge label={l.source} tone="bg-slate-100 text-slate-700 border-slate-200" />
                  </div>
                  {l.nextFollowUp && (
                    <div className="mt-2 text-[11px] text-muted-foreground">Next: {formatDate(l.nextFollowUp)}</div>
                  )}
                  <StatusBadge label={LEAD_STATUSES.find((s) => s.key === l.status)!.label} tone={tone} className="mt-2" />
                </div>
              );
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}