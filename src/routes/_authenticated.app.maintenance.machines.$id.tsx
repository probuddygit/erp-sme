import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, HardDrive } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/maintenance/machines/$id")({
  component: MachineProfile,
});

type MachineStatus = "running" | "idle" | "under_maintenance" | "breakdown";

const STATUS_LABEL: Record<MachineStatus, string> = {
  running: "Running",
  idle: "Idle",
  under_maintenance: "Under maintenance",
  breakdown: "Breakdown",
};

function statusVariant(s: MachineStatus): "default" | "secondary" | "destructive" | "outline" {
  if (s === "running") return "default";
  if (s === "breakdown") return "destructive";
  if (s === "under_maintenance") return "outline";
  return "secondary";
}

function MachineProfile() {
  const { id } = Route.useParams();
  const { company } = useAuth();
  const { data: m, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["machine", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("machines").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!m) return <div className="text-sm text-muted-foreground">Machine not found.</div>;

  const status = m.status as MachineStatus;

  return (
    <div className="space-y-6">
      <Link to="/app/maintenance/machines" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to machines
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-md flex items-center justify-center bg-muted">
            <HardDrive className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">{m.machine_code}</div>
            <h1 className="text-2xl font-bold tracking-tight">{m.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={statusVariant(status)}>{STATUS_LABEL[status]}</Badge>
              {m.machine_type && <span className="text-xs text-muted-foreground">{m.machine_type}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Identification</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <Field label="Manufacturer" value={m.manufacturer} />
            <Field label="Model" value={m.model_number} />
            <Field label="Serial" value={m.serial_number} />
            <Field label="Capacity" value={m.capacity} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Location</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <Field label="Plant" value={m.plant_location} />
            <Field label="Department" value={m.department} />
            <Field label="Production line" value={m.production_line} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Lifecycle</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <Field label="Installed" value={m.installation_date} />
            <Field label="Warranty expiry" value={m.warranty_expiry} />
            <Field label="Last maintenance" value={m.last_maintenance_date} />
            <Field label="Next maintenance" value={m.next_maintenance_date} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Runtime</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <Field label="Hours" value={`${Number(m.runtime_hours).toFixed(0)} h`} />
            <Field label="Threshold" value={m.runtime_threshold_hours != null ? `${Number(m.runtime_threshold_hours).toFixed(0)} h` : null} />
            <Field label="Frequency" value={m.maintenance_frequency_days != null ? `${m.maintenance_frequency_days} days` : null} />
          </CardContent>
        </Card>
        {m.notes && (
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent className="text-sm whitespace-pre-line">{m.notes}</CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Maintenance history</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Work orders, breakdown logs and spare-part consumption will appear here once those sub-modules are enabled.
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? "—"}</span>
    </div>
  );
}