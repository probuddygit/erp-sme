import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { KanbanBoard } from "@/features/crm/components/KanbanBoard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOpportunities, useStageConfigs, useMoveOpportunityStage, useAccounts, formatINR, formatDate } from "@/features/crm/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/crm/pipeline")({
  component: PipelinePage,
});

function daysBetween(from: string) {
  return Math.max(0, Math.round((Date.now() - new Date(from).getTime()) / 86400000));
}

function PipelinePage() {
  const { data: opps = [] } = useOpportunities();
  const { data: stages = [] } = useStageConfigs("opportunity");
  const { data: accounts = [] } = useAccounts();
  const move = useMoveOpportunityStage();

  const accName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—";

  const totalValue = opps.filter((o) => !["won", "lost"].includes(o.stage)).reduce((s, o) => s + Number(o.value ?? 0), 0);
  const wonValue = opps.filter((o) => o.stage === "won").reduce((s, o) => s + Number(o.value ?? 0), 0);
  const winCount = opps.filter((o) => o.stage === "won").length;
  const closedCount = opps.filter((o) => ["won", "lost"].includes(o.stage)).length;
  const winRate = closedCount > 0 ? Math.round((winCount / closedCount) * 100) : 0;

  const columns = stages.map((s) => ({
    key: s.stage_key, label: s.label, tone: s.tone ?? undefined,
    items: opps.filter((o) => o.stage === s.stage_key),
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Open pipeline</div>
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
            getKey={(o) => o.id}
            summary={(items) => formatINR(items.reduce((s, o) => s + Number(o.value ?? 0), 0))}
            onCardDrop={(id, toStage) => { move.mutate({ id, stage: toStage }); }}
            renderCard={(o) => {
              const days = daysBetween(o.stage_entered_at);
              const threshold = stages.find((s) => s.stage_key === o.stage)?.aging_threshold_days ?? 14;
              const aging =
                threshold === 0 ? "bg-slate-100 text-slate-700 border-slate-200" :
                days >= threshold ? "bg-rose-50 text-rose-700 border-rose-200" :
                days >= Math.round(threshold * 0.6) ? "bg-amber-50 text-amber-800 border-amber-200" :
                "bg-emerald-50 text-emerald-700 border-emerald-200";
              return (
                <div>
                  <div className="truncate text-sm font-medium">{o.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{accName(o.account_id)}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-medium">{formatINR(Number(o.value ?? 0))}</span>
                    <span className="text-muted-foreground">{o.probability}%</span>
                  </div>
                  {o.expected_close && (
                    <div className="mt-1 text-[11px] text-muted-foreground">Close: {formatDate(o.expected_close)}</div>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", aging)}>
                      {days}d in stage
                    </span>
                    <Select value={o.stage} onValueChange={(v) => move.mutate({ id: o.id, stage: v })}>
                      <SelectTrigger className="h-6 w-24 text-[10px] px-2"><SelectValue /></SelectTrigger>
                      <SelectContent>{stages.map((s) => <SelectItem key={s.stage_key} value={s.stage_key} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              );
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}