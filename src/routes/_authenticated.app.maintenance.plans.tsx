import { createFileRoute } from "@tanstack/react-router";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarClock, Wrench } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";

export const Route = createFileRoute("/_authenticated/app/maintenance/plans")({
  component: PlansPage,
});

type Plan = {
  id: string; machine_id: string; name: string;
  maintenance_type: "preventive"|"breakdown"|"corrective"|"inspection";
  frequency_days: number;
  default_priority: "low"|"medium"|"high"|"critical";
  default_checklist: Array<{ label: string; done?: boolean }>;
  next_due_date: string; is_active: boolean; notes: string | null;
};

const EMPTY = {
  machine_id: "", name: "", maintenance_type: "preventive" as Plan["maintenance_type"],
  frequency_days: "30", default_priority: "medium" as Plan["default_priority"],
  default_checklist_text: "",
  next_due_date: new Date().toISOString().slice(0,10),
  is_active: true, notes: "",
};

function PlansPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("maintenance") || hasRole("production");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState(EMPTY);

  const machinesQ = useQuery({
    enabled: !!company?.id,
    queryKey: ["machines-mini", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("machines").select("id,name,machine_code").eq("company_id", company!.id).order("name");
      if (error) throw error; return data as Array<{id:string;name:string;machine_code:string}>;
    },
  });

  const { data } = useQuery({
    enabled: !!company?.id,
    queryKey: ["plans", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance_plans").select("*").eq("company_id", company!.id).order("next_due_date");
      if (error) throw error; return (data ?? []) as unknown as Plan[];
    },
  });

  const reset = () => { setEditingId(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.machine_id || !form.name.trim()) { toast.error("Machine and name required"); return; }
    const checklist = form.default_checklist_text.split("\n").map(s => s.trim()).filter(Boolean).map(label => ({ label, done: false }));
    const payload = {
      machine_id: form.machine_id,
      name: form.name.trim(),
      maintenance_type: form.maintenance_type,
      frequency_days: Math.max(1, Number(form.frequency_days) || 30),
      default_priority: form.default_priority,
      default_checklist: checklist,
      next_due_date: form.next_due_date,
      is_active: form.is_active,
      notes: form.notes.trim() || null,
    };
    const row = { ...payload, company_id: company!.id } as never;
    const { error } = editingId
      ? await supabase.from("maintenance_plans").update(payload as never).eq("id", editingId)
      : await supabase.from("maintenance_plans").insert(row);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Plan updated" : "Plan created");
    setOpen(false); reset();
    qc.invalidateQueries({ queryKey: ["plans"] });
  };

  const startEdit = (p: Plan) => {
    setEditingId(p.id);
    setForm({
      machine_id: p.machine_id, name: p.name, maintenance_type: p.maintenance_type,
      frequency_days: String(p.frequency_days),
      default_priority: p.default_priority,
      default_checklist_text: (Array.isArray(p.default_checklist) ? p.default_checklist : []).map(c => c.label).join("\n"),
      next_due_date: p.next_due_date,
      is_active: p.is_active, notes: p.notes ?? "",
    });
    setOpen(true);
  };

  const generateNow = async (p: Plan) => {
    const machine = machinesQ.data?.find(m => m.id === p.machine_id);
    const { error } = await supabase.from("maintenance_tickets").insert({
      company_id: company!.id, machine_id: p.machine_id, plan_id: p.id,
      maintenance_type: p.maintenance_type, scheduled_date: p.next_due_date,
      priority: p.default_priority,
      checklist: p.default_checklist as never,
      notes: `From plan: ${p.name}${machine ? ` · ${machine.name}` : ""}`,
    } as never);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticket generated from plan");
    qc.invalidateQueries({ queryKey: ["tickets"] });
  };

  const machineMap = Object.fromEntries((machinesQ.data ?? []).map(m => [m.id, m]));
  const today = new Date().toISOString().slice(0,10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{data?.length ?? 0} recurring plans</div>
        {canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />New plan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? "Edit plan" : "New maintenance plan"}</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Plan name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Monthly lube & inspection" /></div>
                  <div>
                    <Label>Machine *</Label>
                    <Select value={form.machine_id} onValueChange={(v) => setForm({ ...form, machine_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Choose machine" /></SelectTrigger>
                      <SelectContent>{(machinesQ.data ?? []).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={form.maintenance_type} onValueChange={(v) => setForm({ ...form, maintenance_type: v as Plan["maintenance_type"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["preventive","corrective","inspection"] as const).map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Frequency (days)</Label><Input type="number" value={form.frequency_days} onChange={(e) => setForm({ ...form, frequency_days: e.target.value })} /></div>
                  <div>
                    <Label>Default priority</Label>
                    <Select value={form.default_priority} onValueChange={(v) => setForm({ ...form, default_priority: v as Plan["default_priority"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{(["low","medium","high","critical"] as const).map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Next due date</Label><Input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} /></div>
                  <div className="flex items-end gap-2">
                    <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                    <Label className="mb-1.5">Active</Label>
                  </div>
                </div>
                <div>
                  <Label>Default checklist (one per line)</Label>
                  <Textarea rows={5} value={form.default_checklist_text} onChange={(e) => setForm({ ...form, default_checklist_text: e.target.value })} placeholder={"Lubricate bearings\nCheck belt tension\nClean filters"} />
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
                <TableHead>Plan</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Every</TableHead>
                <TableHead>Next due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((p) => {
                const overdue = p.is_active && p.next_due_date <= today;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm">{machineMap[p.machine_id]?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm capitalize">{p.maintenance_type}</TableCell>
                    <TableCell className="text-sm">{p.frequency_days} days</TableCell>
                    <TableCell className="text-sm">
                      {p.next_due_date} {overdue && <Badge variant="destructive" className="ml-1 text-[10px]">Due</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Paused"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-7" onClick={() => generateNow(p)}>
                            <Wrench className="h-3.5 w-3.5 mr-1" />Generate
                          </Button>
                          <RowActions
                            onEdit={() => startEdit(p)}
                            table="maintenance_plans"
                            id={p.id}
                            label={`plan "${p.name}"`}
                            invalidateKeys={[["plans", company?.id]]}
                          />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!data?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                    <CalendarClock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    No recurring plans yet.
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