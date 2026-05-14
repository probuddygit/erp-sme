import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";

export const Route = createFileRoute("/_authenticated/app/maintenance/machines")({
  component: MachinesPage,
});

type MachineStatus = "running" | "idle" | "under_maintenance" | "breakdown";
type Machine = {
  id: string;
  machine_code: string;
  name: string;
  machine_type: string | null;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  installation_date: string | null;
  warranty_expiry: string | null;
  plant_location: string | null;
  department: string | null;
  production_line: string | null;
  capacity: string | null;
  status: MachineStatus;
  runtime_hours: number;
  runtime_threshold_hours: number | null;
  maintenance_frequency_days: number | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  notes: string | null;
};

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

const EMPTY_FORM = {
  machine_code: "",
  name: "",
  machine_type: "",
  manufacturer: "",
  model_number: "",
  serial_number: "",
  installation_date: "",
  warranty_expiry: "",
  plant_location: "",
  department: "",
  production_line: "",
  capacity: "",
  status: "idle" as MachineStatus,
  runtime_threshold_hours: "",
  maintenance_frequency_days: "",
  notes: "",
};

function MachinesPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("maintenance") || hasRole("production");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data } = useQuery({
    enabled: !!company?.id,
    queryKey: ["machines", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .eq("company_id", company!.id)
        .order("name");
      if (error) throw error;
      return data as Machine[];
    },
  });

  const reset = () => { setEditingId(null); setForm(EMPTY_FORM); };

  const save = async () => {
    if (!form.machine_code.trim() || !form.name.trim()) { toast.error("Code and name required"); return; }
    const payload = {
      machine_code: form.machine_code.trim(),
      name: form.name.trim(),
      machine_type: form.machine_type.trim() || null,
      manufacturer: form.manufacturer.trim() || null,
      model_number: form.model_number.trim() || null,
      serial_number: form.serial_number.trim() || null,
      installation_date: form.installation_date || null,
      warranty_expiry: form.warranty_expiry || null,
      plant_location: form.plant_location.trim() || null,
      department: form.department.trim() || null,
      production_line: form.production_line.trim() || null,
      capacity: form.capacity.trim() || null,
      status: form.status,
      runtime_threshold_hours: form.runtime_threshold_hours ? Number(form.runtime_threshold_hours) : null,
      maintenance_frequency_days: form.maintenance_frequency_days ? Number(form.maintenance_frequency_days) : null,
      notes: form.notes.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("machines").update(payload).eq("id", editingId)
      : await supabase.from("machines").insert({ ...payload, company_id: company!.id });
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Machine updated" : "Machine created");
    setOpen(false); reset();
    qc.invalidateQueries({ queryKey: ["machines"] });
    qc.invalidateQueries({ queryKey: ["maint-overview"] });
  };

  const startEdit = (m: Machine) => {
    setEditingId(m.id);
    setForm({
      machine_code: m.machine_code,
      name: m.name,
      machine_type: m.machine_type ?? "",
      manufacturer: m.manufacturer ?? "",
      model_number: m.model_number ?? "",
      serial_number: m.serial_number ?? "",
      installation_date: m.installation_date ?? "",
      warranty_expiry: m.warranty_expiry ?? "",
      plant_location: m.plant_location ?? "",
      department: m.department ?? "",
      production_line: m.production_line ?? "",
      capacity: m.capacity ?? "",
      status: m.status,
      runtime_threshold_hours: m.runtime_threshold_hours != null ? String(m.runtime_threshold_hours) : "",
      maintenance_frequency_days: m.maintenance_frequency_days != null ? String(m.maintenance_frequency_days) : "",
      notes: m.notes ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{data?.length ?? 0} machines</div>
        {canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />New machine</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? "Edit machine" : "New machine"}</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Machine code *</Label><Input value={form.machine_code} onChange={(e) => setForm({ ...form, machine_code: e.target.value })} /></div>
                  <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Type</Label><Input value={form.machine_type} onChange={(e) => setForm({ ...form, machine_type: e.target.value })} placeholder="CNC, Press, Lathe…" /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as MachineStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABEL) as MachineStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
                  <div><Label>Model number</Label><Input value={form.model_number} onChange={(e) => setForm({ ...form, model_number: e.target.value })} /></div>
                  <div><Label>Serial number</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
                  <div><Label>Capacity</Label><Input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="e.g. 100 units/hr" /></div>
                  <div><Label>Installation date</Label><Input type="date" value={form.installation_date} onChange={(e) => setForm({ ...form, installation_date: e.target.value })} /></div>
                  <div><Label>Warranty expiry</Label><Input type="date" value={form.warranty_expiry} onChange={(e) => setForm({ ...form, warranty_expiry: e.target.value })} /></div>
                  <div><Label>Plant / location</Label><Input value={form.plant_location} onChange={(e) => setForm({ ...form, plant_location: e.target.value })} /></div>
                  <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                  <div><Label>Production line</Label><Input value={form.production_line} onChange={(e) => setForm({ ...form, production_line: e.target.value })} /></div>
                  <div><Label>Runtime threshold (hrs)</Label><Input type="number" value={form.runtime_threshold_hours} onChange={(e) => setForm({ ...form, runtime_threshold_hours: e.target.value })} /></div>
                  <div><Label>Maintenance frequency (days)</Label><Input type="number" value={form.maintenance_frequency_days} onChange={(e) => setForm({ ...form, maintenance_frequency_days: e.target.value })} /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>{editingId ? "Save" : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Runtime</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.machine_code}</TableCell>
                  <TableCell>
                    <Link to="/app/maintenance/machines/$id" params={{ id: m.id }} className="font-medium hover:underline">
                      {m.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.machine_type ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.plant_location ?? "—"}</TableCell>
                  <TableCell><Badge variant={statusVariant(m.status)}>{STATUS_LABEL[m.status]}</Badge></TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {Number(m.runtime_hours).toFixed(0)}{m.runtime_threshold_hours ? ` / ${Number(m.runtime_threshold_hours).toFixed(0)}` : ""} h
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <RowActions
                        onEdit={() => startEdit(m)}
                        table="machines"
                        id={m.id}
                        label={`machine "${m.name}"`}
                        invalidateKeys={[["machines", company?.id], ["maint-overview", company?.id]]}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!data?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                    <HardDrive className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    No machines yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}