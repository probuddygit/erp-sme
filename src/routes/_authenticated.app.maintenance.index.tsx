import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, AlertTriangle, PauseCircle, Wrench, HardDrive } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/maintenance/")({
  component: MaintenanceOverview,
});

type MachineRow = { id: string; status: "running" | "idle" | "under_maintenance" | "breakdown"; name: string; runtime_hours: number; runtime_threshold_hours: number | null; next_maintenance_date: string | null };

function MaintenanceOverview() {
  const { company } = useAuth();
  const { data } = useQuery({
    enabled: !!company?.id,
    queryKey: ["maint-overview", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("id,status,name,runtime_hours,runtime_threshold_hours,next_maintenance_date")
        .eq("company_id", company!.id);
      if (error) throw error;
      return data as MachineRow[];
    },
  });

  const machines = data ?? [];
  const counts = {
    running: machines.filter((m) => m.status === "running").length,
    idle: machines.filter((m) => m.status === "idle").length,
    under_maintenance: machines.filter((m) => m.status === "under_maintenance").length,
    breakdown: machines.filter((m) => m.status === "breakdown").length,
  };
  const today = new Date().toISOString().slice(0, 10);
  const dueSoon = machines.filter((m) => m.next_maintenance_date && m.next_maintenance_date <= today);
  const overRuntime = machines.filter(
    (m) => m.runtime_threshold_hours != null && Number(m.runtime_hours) >= Number(m.runtime_threshold_hours),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat label="Running" value={counts.running} icon={Activity} tone="text-emerald-500" />
        <Stat label="Idle" value={counts.idle} icon={PauseCircle} tone="text-muted-foreground" />
        <Stat label="Under maintenance" value={counts.under_maintenance} icon={Wrench} tone="text-amber-500" />
        <Stat label="Breakdown" value={counts.breakdown} icon={AlertTriangle} tone="text-destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Maintenance due</div>
              <Wrench className="h-4 w-4 text-amber-500" />
            </div>
            {dueSoon.length === 0 && <div className="text-sm text-muted-foreground">No machines due.</div>}
            <ul className="space-y-2">
              {dueSoon.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <Link to="/app/maintenance/machines/$id" params={{ id: m.id }} className="hover:underline">{m.name}</Link>
                  <span className="text-xs text-muted-foreground">{m.next_maintenance_date}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Runtime threshold reached</div>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            {overRuntime.length === 0 && <div className="text-sm text-muted-foreground">All machines within threshold.</div>}
            <ul className="space-y-2">
              {overRuntime.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <Link to="/app/maintenance/machines/$id" params={{ id: m.id }} className="hover:underline">{m.name}</Link>
                  <span className="text-xs text-muted-foreground">{Number(m.runtime_hours).toFixed(0)}h / {Number(m.runtime_threshold_hours).toFixed(0)}h</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {machines.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <HardDrive className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <div className="font-medium">No machines yet</div>
            <div className="text-sm text-muted-foreground mt-1">
              Add your first machine to start tracking maintenance.
            </div>
            <Link to="/app/maintenance/machines" className="inline-block mt-4 text-sm text-accent hover:underline">
              Go to Machines →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Activity; tone: string }) {
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