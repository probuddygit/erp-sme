import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { KanbanBoard } from "@/features/crm/components/KanbanBoard";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { useLeads, formatINR, formatDate } from "@/features/crm/api";

export const Route = createFileRoute("/_authenticated/workspace/crm/pipeline")({
  component: LeadPipelinePage,
});

const STATUSES = [
  { key: "new", label: "New", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "contacted", label: "Contacted", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "qualified", label: "Qualified", tone: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "proposal", label: "Proposal", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  { key: "won", label: "Won", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "lost", label: "Lost", tone: "bg-rose-50 text-rose-700 border-rose-200" },
];

function LeadPipelinePage() {
  const { data: leads = [] } = useLeads();
  const columns = STATUSES.map((s) => ({
    key: s.key, label: s.label, tone: s.tone,
    items: leads.filter((l) => l.status === s.key),
  }));

  const totalValue = leads.reduce((sum, l) => sum + Number(l.expected_value ?? 0), 0);
  const wonValue = leads.filter((l) => l.status === "won").reduce((s, l) => s + Number(l.expected_value ?? 0), 0);
  const winRate = leads.length > 0 ? Math.round((leads.filter((l) => l.status === "won").length / leads.length) * 100) : 0;

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
            summary={(items) => formatINR(items.reduce((s, l) => s + Number(l.expected_value ?? 0), 0))}
            renderCard={(l) => {
              const tone = STATUSES.find((s) => s.key === l.status)?.tone;
              return (
                <div>
                  <div className="truncate text-sm font-medium">{l.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{l.company_name ?? l.contact_name ?? "—"}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-medium">{formatINR(Number(l.expected_value ?? 0))}</span>
                    <span className="text-muted-foreground">{l.win_probability}%</span>
                  </div>
                  {l.expected_close_date && (
                    <div className="mt-2 text-[11px] text-muted-foreground">Close: {formatDate(l.expected_close_date)}</div>
                  )}
                  <StatusBadge label={STATUSES.find((s) => s.key === l.status)?.label ?? l.status} tone={tone} className="mt-2" />
                </div>
              );
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}