import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, StopCircle, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";

export const Route = createFileRoute("/_authenticated/app/maintenance/runtime")({
  component: RuntimePage,
});

type Reason = "mechanical_failure"|"electrical_failure"|"power_failure"|"material_shortage"|"operator_error"|"scheduled_maintenance"|"qc_hold"|"other";
const REASONS: Reason[] = ["mechanical_failure","electrical_failure","power_failure","material_shortage","operator_error","scheduled_maintenance","qc_hold","other"];
const REASON_LABEL: Record<Reason, string> = {
  mechanical_failure: "Mechanical failure", electrical_failure: "Electrical failure",
  power_failure: "Power failure", material_shortage: "Material shortage",
  operator_error: "Operator error", scheduled_maintenance: "Scheduled maintenance",
  qc_hold: "QC hold", other: "Other",
};

type Runtime = { id: string; machine_id: string; started_at: string; ended_at: string|null; runtime_hours: number; operator: string|null; notes: string|null };
type Downtime = { id: string; machine_id: string; started_at: string; ended_at: string|null; downtime_hours: number; reason: Reason; notes: string|null };

function RuntimePage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("maintenance") || hasRole("production");

  const machinesQ = useQuery({
    enabled: !!company?.id,
    queryKey: ["machines-mini", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("machines").select("id,name,machine_code,status").eq("company_id", company!.id).order("name");
      if (error) throw error;
      return data as Array<{id:string;name:string;machine_code:string;status:string}>;
    },
  });

  const runtimeQ = useQuery({
    enabled: !!company?.id,
    queryKey: ["runtime-logs", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("machine_runtime_logs").select("*").eq("company_id", company!.id).order("started_at", { ascending: false }).limit(100);
      if (error) throw error; return (data ?? []) as unknown as Runtime[];
    },
  });

  const downtimeQ = useQuery({
    enabled: !!company?.id,
    queryKey: ["downtime-logs", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("machine_downtime_logs").select("*").eq("company_id", company!.id).order("started_at", { ascending: false }).limit(100);
      if (error) throw error; return (data ?? []) as unknown as Downtime[];
    },
  });

  const machineMap = useMemo(() => Object.fromEntries((machinesQ.data ?? []).map(m => [m.id, m])), [machinesQ.data]);

  // ---- Runtime: start / stop ----
  const [startMachine, setStartMachine] = useState<string>("");
  const [operator, setOperator] = useState<string>("");
  const startRun = async () => {
    if (!startMachine) { toast.error("Choose a machine"); return; }
    const { error } = await supabase.from("machine_runtime_logs").insert({
      company_id: company!.id, machine_id: startMachine, started_at: new Date().toISOString(), operator: operator || null,
    } as never);
    if (error) { toast.error(error.message); return; }
    await supabase.from("machines").update({ status: "running" }).eq("id", startMachine);
    toast.success("Runtime started");
    qc.invalidateQueries({ queryKey: ["runtime-logs"] });
    qc.invalidateQueries({ queryKey: ["machines-mini"] });
    qc.invalidateQueries({ queryKey: ["machines"] });
    setStartMachine(""); setOperator("");
  };

  const stopRun = async (r: Runtime) => {
    const { error } = await supabase.from("machine_runtime_logs").update({ ended_at: new Date().toISOString() }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("machines").update({ status: "idle" }).eq("id", r.machine_id);
    toast.success("Runtime stopped");
    qc.invalidateQueries({ queryKey: ["runtime-logs"] });
    qc.invalidateQueries({ queryKey: ["machines"] });
    qc.invalidateQueries({ queryKey: ["machines-mini"] });
  };

  // ---- Downtime dialog ----
  const [dtOpen, setDtOpen] = useState(false);
  const [dt, setDt] = useState({ machine_id: "", started_at: new Date().toISOString().slice(0,16), ended_at: "", reason: "other" as Reason, notes: "" });
  const submitDowntime = async () => {
    if (!dt.machine_id) { toast.error("Choose a machine"); return; }
    const { error } = await supabase.from("machine_downtime_logs").insert({
      company_id: company!.id,
      machine_id: dt.machine_id,
      started_at: new Date(dt.started_at).toISOString(),
      ended_at: dt.ended_at ? new Date(dt.ended_at).toISOString() : null,
      reason: dt.reason,
      notes: dt.notes || null,
    } as never);
    if (error) { toast.error(error.message); return; }
    if (!dt.ended_at) {
      await supabase.from("machines").update({ status: "breakdown" }).eq("id", dt.machine_id);
    }
    toast.success("Downtime logged");
    setDtOpen(false);
    setDt({ machine_id: "", started_at: new Date().toISOString().slice(0,16), ended_at: "", reason: "other", notes: "" });
    qc.invalidateQueries({ queryKey: ["downtime-logs"] });
    qc.invalidateQueries({ queryKey: ["machines-mini"] });
    qc.invalidateQueries({ queryKey: ["machines"] });
  };

  const closeDowntime = async (d: Downtime) => {
    const { error } = await supabase.from("machine_downtime_logs").update({ ended_at: new Date().toISOString() }).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("machines").update({ status: "idle" }).eq("id", d.machine_id);
    qc.invalidateQueries({ queryKey: ["downtime-logs"] });
    qc.invalidateQueries({ queryKey: ["machines-mini"] });
    qc.invalidateQueries({ queryKey: ["machines"] });
  };

  return (
    <Tabs defaultValue="runtime" className="space-y-4">
      <TabsList>
        <TabsTrigger value="runtime">Runtime logs</TabsTrigger>
        <TabsTrigger value="downtime">Downtime logs</TabsTrigger>
      </TabsList>

      <TabsContent value="runtime" className="space-y-4">
        {canEdit && (
          <Card>
            <CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <Label>Machine</Label>
                <Select value={startMachine} onValueChange={setStartMachine}>
                  <SelectTrigger><SelectValue placeholder="Choose machine" /></SelectTrigger>
                  <SelectContent>{(machinesQ.data ?? []).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Operator (optional)</Label>
                <Input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Operator name" />
              </div>
              <div className="flex items-end">
                <Button onClick={startRun}><Play className="h-4 w-4 mr-1" />Start runtime</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(runtimeQ.data ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{machineMap[r.machine_id]?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.operator ?? "—"}</TableCell>
                    <TableCell className="text-sm">{new Date(r.started_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">
                      {r.ended_at ? new Date(r.ended_at).toLocaleString() : <Badge variant="default">Running</Badge>}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{Number(r.runtime_hours).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {canEdit && !r.ended_at && (
                        <Button size="sm" variant="outline" className="h-7" onClick={() => stopRun(r)}>
                          <StopCircle className="h-3.5 w-3.5 mr-1" />Stop
                        </Button>
                      )}
                      {canEdit && r.ended_at && (
                        <RowActions table="machine_runtime_logs" id={r.id} label="runtime entry"
                          invalidateKeys={[["runtime-logs", company?.id]]} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!runtimeQ.data?.length && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No runtime entries.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="downtime" className="space-y-4">
        <div className="flex justify-end">
          {canEdit && (
            <Dialog open={dtOpen} onOpenChange={setDtOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />Log downtime</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log downtime</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div>
                    <Label>Machine</Label>
                    <Select value={dt.machine_id} onValueChange={(v) => setDt({ ...dt, machine_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Choose machine" /></SelectTrigger>
                      <SelectContent>{(machinesQ.data ?? []).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Select value={dt.reason} onValueChange={(v) => setDt({ ...dt, reason: v as Reason })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{REASONS.map(r => <SelectItem key={r} value={r}>{REASON_LABEL[r]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Started</Label><Input type="datetime-local" value={dt.started_at} onChange={(e) => setDt({ ...dt, started_at: e.target.value })} /></div>
                    <div><Label>Ended (leave blank if ongoing)</Label><Input type="datetime-local" value={dt.ended_at} onChange={(e) => setDt({ ...dt, ended_at: e.target.value })} /></div>
                  </div>
                  <div><Label>Notes</Label><Textarea value={dt.notes} onChange={(e) => setDt({ ...dt, notes: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDtOpen(false)}>Cancel</Button>
                  <Button onClick={submitDowntime}>Save</Button>
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
                  <TableHead>Machine</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(downtimeQ.data ?? []).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{machineMap[d.machine_id]?.name ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{REASON_LABEL[d.reason]}</Badge></TableCell>
                    <TableCell className="text-sm">{new Date(d.started_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{d.ended_at ? new Date(d.ended_at).toLocaleString() : <Badge variant="destructive">Ongoing</Badge>}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{Number(d.downtime_hours).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {canEdit && !d.ended_at && (
                        <Button size="sm" variant="outline" className="h-7" onClick={() => closeDowntime(d)}>Close</Button>
                      )}
                      {canEdit && d.ended_at && (
                        <RowActions table="machine_downtime_logs" id={d.id} label="downtime entry"
                          invalidateKeys={[["downtime-logs", company?.id]]} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!downtimeQ.data?.length && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                    <AlertTriangle className="h-5 w-5 mx-auto mb-1 opacity-50" />
                    No downtime entries.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}