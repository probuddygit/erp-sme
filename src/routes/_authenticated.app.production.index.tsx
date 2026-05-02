import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListChecks, GitBranch, Factory, CheckCircle2, Clock, AlertCircle, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/production/")({
  component: ProductionOverview,
});

function ProductionOverview() {
  const { company } = useAuth();

  const { data: stats } = useQuery({
    enabled: !!company?.id,
    queryKey: ["production-stats", company?.id],
    queryFn: async () => {
      const [wos, boms, recent] = await Promise.all([
        supabase.from("work_orders").select("id, status").eq("company_id", company!.id),
        supabase.from("bills_of_materials").select("id").eq("company_id", company!.id),
        supabase
          .from("work_orders")
          .select("id, wo_number, product_name, status, planned_quantity, produced_quantity, scheduled_start, scheduled_end")
          .eq("company_id", company!.id)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      const wo = wos.data ?? [];
      const counts = {
        planned: wo.filter((w) => w.status === "planned").length,
        released: wo.filter((w) => w.status === "released").length,
        in_progress: wo.filter((w) => w.status === "in_progress").length,
        completed: wo.filter((w) => w.status === "completed").length,
        cancelled: wo.filter((w) => w.status === "cancelled").length,
        total: wo.length,
      };
      return { counts, bomCount: boms.data?.length ?? 0, recent: recent.data ?? [] };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total work orders" value={stats?.counts.total ?? 0} icon={ListChecks} />
        <StatCard label="In progress" value={stats?.counts.in_progress ?? 0} icon={PlayCircle} accent />
        <StatCard label="Completed" value={stats?.counts.completed ?? 0} icon={CheckCircle2} />
        <StatCard label="Active BOMs" value={stats?.bomCount ?? 0} icon={GitBranch} />
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <PipelineTile label="Planned" count={stats?.counts.planned ?? 0} tone="muted" icon={Clock} />
        <PipelineTile label="Released" count={stats?.counts.released ?? 0} tone="info" icon={ListChecks} />
        <PipelineTile label="In progress" count={stats?.counts.in_progress ?? 0} tone="accent" icon={PlayCircle} />
        <PipelineTile label="Completed" count={stats?.counts.completed ?? 0} tone="success" icon={CheckCircle2} />
        <PipelineTile label="Cancelled" count={stats?.counts.cancelled ?? 0} tone="warn" icon={AlertCircle} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent work orders</CardTitle>
          <Button asChild size="sm" variant="outline"><Link to="/app/production/work-orders">View all</Link></Button>
        </CardHeader>
        <CardContent>
          {stats?.recent.length ? (
            <div className="divide-y divide-border">
              {stats.recent.map((w) => (
                <Link
                  key={w.id}
                  to="/app/production/work-orders/$id"
                  params={{ id: w.id }}
                  className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded-md transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{w.wo_number}</span>
                      <StatusBadge status={w.status} />
                    </div>
                    <div className="font-medium truncate">{w.product_name}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{w.produced_quantity} / {w.planned_quantity}</div>
                    <div className="text-xs text-muted-foreground">
                      {w.scheduled_start ?? "—"} → {w.scheduled_end ?? "—"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">
              <Factory className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No work orders yet. <Link to="/app/production/work-orders" className="text-accent hover:underline">Create one</Link>.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: typeof ListChecks; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <Icon className={accent ? "h-4 w-4 text-accent" : "h-4 w-4 text-muted-foreground"} />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function PipelineTile({ label, count, tone, icon: Icon }: { label: string; count: number; tone: "muted" | "info" | "accent" | "success" | "warn"; icon: typeof Clock }) {
  const toneClass = {
    muted: "bg-muted text-muted-foreground",
    info: "bg-secondary text-secondary-foreground",
    accent: "bg-accent/15 text-accent",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    warn: "bg-destructive/15 text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="mt-3 text-2xl font-bold">{count}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    planned: { label: "Planned", cls: "bg-muted text-muted-foreground" },
    released: { label: "Released", cls: "bg-secondary text-secondary-foreground" },
    in_progress: { label: "In progress", cls: "bg-accent/15 text-accent" },
    completed: { label: "Completed", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    cancelled: { label: "Cancelled", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted" };
  return <Badge variant="outline" className={`border-0 ${m.cls}`}>{m.label}</Badge>;
}