import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, Clock, AlertOctagon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/maintenance/analytics")({
  component: AnalyticsPage,
});

type Reason = string;
type Runtime = { machine_id: string; runtime_hours: number; started_at: string; ended_at: string|null };
type Downtime = { machine_id: string; downtime_hours: number; reason: Reason; started_at: string; ended_at: string|null };
type Ticket = { machine_id: string; status: string; maintenance_type: string; completed_at: string|null; created_at: string };

function AnalyticsPage() {
  const { company } = useAuth();

  const machinesQ = useQuery({
    enabled: !!company?.id,
    queryKey: ["machines-mini", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("machines").select("id,name,runtime_hours").eq("company_id", company!.id).order("name");
      if (error) throw error; return data as Array<{id:string;name:string;runtime_hours:number}>;
    },
  });
  const runtimeQ = useQuery({
    enabled: !!company?.id,
    queryKey: ["runtime-logs-all", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("machine_runtime_logs").select("machine_id,runtime_hours,started_at,ended_at").eq("company_id", company!.id);
      if (error) throw error; return (data ?? []) as unknown as Runtime[];
    },
  });
  const downtimeQ = useQuery({
    enabled: !!company?.id,
    queryKey: ["downtime-logs-all", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("machine_downtime_logs").select("machine_id,downtime_hours,reason,started_at,ended_at").eq("company_id", company!.id);
      if (error) throw error; return (data ?? []) as unknown as Downtime[];
    },
  });
  const ticketsQ = useQuery({
    enabled: !!company?.id,
    queryKey: ["tickets-all", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance_tickets").select("machine_id,status,maintenance_type,completed_at,created_at").eq("company_id", company!.id);
      if (error) throw error; return (data ?? []) as unknown as Ticket[];
    },
  });

  const stats = useMemo(() => {
    const machines = machinesQ.data ?? [];
    const dts = downtimeQ.data ?? [];
    const rts = runtimeQ.data ?? [];
    const tks = ticketsQ.data ?? [];

    const totalRun = rts.reduce((s, r) => s + Number(r.runtime_hours || 0), 0);
    const totalDown = dts.reduce((s, d) => s + Number(d.downtime_hours || 0), 0);
    const utilization = totalRun + totalDown > 0 ? (totalRun / (totalRun + totalDown)) * 100 : 0;

    // Per-machine
    const perMachine = machines.map((m) => {
      const r = rts.filter(x => x.machine_id === m.id).reduce((s, x) => s + Number(x.runtime_hours||0), 0);
      const d = dts.filter(x => x.machine_id === m.id).reduce((s, x) => s + Number(x.downtime_hours||0), 0);
      const breakdowns = dts.filter(x => x.machine_id === m.id && x.reason !== "scheduled_maintenance").length;
      const repairs = tks.filter(x => x.machine_id === m.id && x.maintenance_type === "breakdown" && x.completed_at).length;
      const repairHours = tks
        .filter(x => x.machine_id === m.id && x.maintenance_type === "breakdown" && x.completed_at)
        .reduce((s, x) => {
          const start = new Date(x.created_at).getTime();
          const end = x.completed_at ? new Date(x.completed_at).getTime() : start;
          return s + Math.max(0, (end - start) / 3.6e6);
        }, 0);
      const mtbf = breakdowns > 0 ? r / breakdowns : null;       // hours between failures
      const mttr = repairs > 0 ? repairHours / repairs : null;   // hours per repair
      const u = r + d > 0 ? (r / (r + d)) * 100 : 0;
      return { id: m.id, name: m.name, runtime: r, downtime: d, utilization: u, mtbf, mttr, breakdowns };
    });

    // Downtime by reason
    const reasonAgg = new Map<string, number>();
    for (const d of dts) reasonAgg.set(d.reason, (reasonAgg.get(d.reason) ?? 0) + Number(d.downtime_hours||0));
    const reasons = Array.from(reasonAgg.entries()).sort((a,b) => b[1]-a[1]);
    const reasonMax = Math.max(1, ...reasons.map(([,v]) => v));

    return { totalRun, totalDown, utilization, perMachine, reasons, reasonMax };
  }, [machinesQ.data, runtimeQ.data, downtimeQ.data, ticketsQ.data]);

  const REASON_LABEL: Record<string,string> = {
    mechanical_failure: "Mechanical", electrical_failure: "Electrical", power_failure: "Power",
    material_shortage: "Material", operator_error: "Operator", scheduled_maintenance: "Scheduled",
    qc_hold: "QC hold", other: "Other",
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPI label="Total runtime" value={`${stats.totalRun.toFixed(0)}h`} icon={Activity} tone="text-emerald-500" />
        <KPI label="Total downtime" value={`${stats.totalDown.toFixed(0)}h`} icon={AlertOctagon} tone="text-destructive" />
        <KPI label="Overall utilization" value={`${stats.utilization.toFixed(1)}%`} icon={TrendingUp} tone="text-primary" />
        <KPI label="Machines tracked" value={String((machinesQ.data ?? []).length)} icon={Clock} tone="text-amber-500" />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Per-machine performance</div>
          {stats.perMachine.length === 0 ? (
            <div className="text-sm text-muted-foreground">No machines.</div>
          ) : (
            <div className="space-y-3">
              {stats.perMachine.map((m) => (
                <div key={m.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Util {m.utilization.toFixed(1)}% · Run {m.runtime.toFixed(1)}h · Down {m.downtime.toFixed(1)}h ·
                      MTBF {m.mtbf != null ? `${m.mtbf.toFixed(1)}h` : "—"} ·
                      MTTR {m.mttr != null ? `${m.mttr.toFixed(1)}h` : "—"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                    <div className="bg-emerald-500" style={{ width: `${(m.runtime/Math.max(1,m.runtime+m.downtime))*100}%` }} />
                    <div className="bg-destructive" style={{ width: `${(m.downtime/Math.max(1,m.runtime+m.downtime))*100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Downtime by reason</div>
          {stats.reasons.length === 0 ? (
            <div className="text-sm text-muted-foreground">No downtime recorded.</div>
          ) : (
            <div className="space-y-2">
              {stats.reasons.map(([reason, hours]) => (
                <div key={reason} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{REASON_LABEL[reason] ?? reason}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{hours.toFixed(1)}h</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(hours/stats.reasonMax)*100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Activity; tone: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <Icon className={`h-4 w-4 ${tone}`} />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}