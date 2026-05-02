import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, PlayCircle, CheckCircle2, XCircle, Send, Package, Boxes, Activity, Calculator } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "./_authenticated.app.production.index";

export const Route = createFileRoute("/_authenticated/app/production/work-orders/$id")({
  component: WorkOrderDetailPage,
});

interface WO {
  id: string;
  wo_number: string;
  product_name: string;
  planned_quantity: number;
  produced_quantity: number;
  unit: string;
  status: "planned" | "released" | "in_progress" | "completed" | "cancelled";
  priority: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  notes: string | null;
  bom_id: string | null;
  sales_order_id: string | null;
  auto_triggered: boolean;
}

function WorkOrderDetailPage() {
  const { id } = Route.useParams();
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("production");
  const [matOpen, setMatOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [matForm, setMatForm] = useState({ material_name: "", material_code: "", quantity: "1", unit: "pcs", unit_cost: "0" });
  const [outForm, setOutForm] = useState({ quantity: "1", is_scrap: false, notes: "" });

  const { data: wo } = useQuery({
    enabled: !!company?.id,
    queryKey: ["wo", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_orders").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as WO | null;
    },
  });

  const { data: logs } = useQuery({
    enabled: !!company?.id,
    queryKey: ["wo-logs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_logs")
        .select("*")
        .eq("work_order_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; event: string; from_status: string | null; to_status: string | null; notes: string | null; created_at: string }[];
    },
  });

  const { data: materials } = useQuery({
    enabled: !!company?.id,
    queryKey: ["wo-materials", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_consumption")
        .select("*")
        .eq("work_order_id", id)
        .order("consumed_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; material_name: string; material_code: string | null; quantity: number; unit: string; unit_cost: number; total_cost: number; consumed_at: string }[];
    },
  });

  const { data: outputs } = useQuery({
    enabled: !!company?.id,
    queryKey: ["wo-outputs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_output")
        .select("*")
        .eq("work_order_id", id)
        .order("produced_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; quantity: number; unit: string; is_scrap: boolean; produced_at: string; notes: string | null }[];
    },
  });

  const { data: required } = useQuery({
    enabled: !!company?.id && !!wo?.bom_id,
    queryKey: ["wo-required", id, wo?.bom_id, wo?.planned_quantity],
    queryFn: async () => {
    const { data, error } = await supabase.rpc("explode_bom", { _bom_id: wo!.bom_id!, _qty: wo!.planned_quantity });
      if (error) throw error;
      return data as { material_name: string; material_code: string | null; unit: string; total_quantity: number; total_cost: number }[];
    },
  });

  const transition = async (toStatus: WO["status"], event: string) => {
    if (!wo) return;
    const { data: u } = await supabase.auth.getUser();
    const updates: Partial<WO> & { actual_start?: string; actual_end?: string } = { status: toStatus };
    if (toStatus === "in_progress" && !wo.actual_start) updates.actual_start = new Date().toISOString();
    if (toStatus === "completed") updates.actual_end = new Date().toISOString();
    const { error: e1 } = await supabase.from("work_orders").update(updates).eq("id", id);
    if (e1) { toast.error(e1.message); return; }
    await supabase.from("production_logs").insert([{
      company_id: company!.id,
      work_order_id: id,
      event: event as "released" | "started" | "completed" | "cancelled" | "paused" | "resumed" | "note" | "created",
      from_status: wo.status,
      to_status: toStatus,
      created_by: u.user?.id ?? null,
    }]);
    toast.success(`Work order ${event}`);
    qc.invalidateQueries({ queryKey: ["wo", id] });
    qc.invalidateQueries({ queryKey: ["wo-logs", id] });
    qc.invalidateQueries({ queryKey: ["work-orders"] });
  };

  const recordMaterial = async () => {
    if (!matForm.material_name.trim()) { toast.error("Material is required"); return; }
    const { data: u } = await supabase.auth.getUser();
    const qty = Number(matForm.quantity) || 0;
    const unitCost = Number(matForm.unit_cost) || 0;
    const { error } = await supabase.from("material_consumption").insert({
      company_id: company!.id,
      work_order_id: id,
      material_name: matForm.material_name.trim(),
      material_code: matForm.material_code.trim() || null,
      quantity: qty,
      unit: matForm.unit.trim() || "pcs",
      unit_cost: unitCost,
      total_cost: qty * unitCost,
      created_by: u.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Material consumption recorded");
    setMatOpen(false);
    setMatForm({ material_name: "", material_code: "", quantity: "1", unit: "pcs", unit_cost: "0" });
    qc.invalidateQueries({ queryKey: ["wo-materials", id] });
  };

  const recordOutput = async () => {
    const { data: u } = await supabase.auth.getUser();
    const qty = Number(outForm.quantity) || 0;
    const { error } = await supabase.from("production_output").insert({
      company_id: company!.id,
      work_order_id: id,
      product_name: wo!.product_name,
      quantity: qty,
      unit: wo!.unit,
      is_scrap: outForm.is_scrap,
      notes: outForm.notes.trim() || null,
      created_by: u.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    if (!outForm.is_scrap) {
      // Increment produced_quantity
      await supabase
        .from("work_orders")
        .update({ produced_quantity: Number(wo!.produced_quantity) + qty })
        .eq("id", id);
    }
    toast.success("Output recorded");
    setOutOpen(false);
    setOutForm({ quantity: "1", is_scrap: false, notes: "" });
    qc.invalidateQueries({ queryKey: ["wo", id] });
    qc.invalidateQueries({ queryKey: ["wo-outputs", id] });
  };

  if (!wo) return <div className="text-muted-foreground">Loading…</div>;

  const totalMatCost = (materials ?? []).reduce((s, m) => s + Number(m.total_cost), 0);
  const totalOutput = (outputs ?? []).filter((o) => !o.is_scrap).reduce((s, o) => s + Number(o.quantity), 0);
  const cogsPerUnit = totalOutput > 0 ? totalMatCost / totalOutput : 0;
  const pct = wo.planned_quantity > 0 ? Math.min(100, (Number(wo.produced_quantity) / Number(wo.planned_quantity)) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/production/work-orders"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{wo.wo_number}</span>
            <StatusBadge status={wo.status} />
            <Badge variant="outline">P{wo.priority}</Badge>
          </div>
          <h2 className="mt-1 text-2xl font-bold">{wo.product_name}</h2>
          <div className="text-sm text-muted-foreground mt-1">
            Plan {wo.planned_quantity} {wo.unit} · Schedule {wo.scheduled_start ?? "—"} → {wo.scheduled_end ?? "—"}
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {wo.status === "planned" && <Button size="sm" onClick={() => transition("released", "released")}><Send className="h-4 w-4 mr-1" />Release</Button>}
            {wo.status === "released" && <Button size="sm" onClick={() => transition("in_progress", "started")}><PlayCircle className="h-4 w-4 mr-1" />Start</Button>}
            {wo.status === "in_progress" && <Button size="sm" onClick={() => transition("completed", "completed")}><CheckCircle2 className="h-4 w-4 mr-1" />Complete</Button>}
            {wo.status !== "completed" && wo.status !== "cancelled" && <Button size="sm" variant="outline" onClick={() => transition("cancelled", "cancelled")}><XCircle className="h-4 w-4 mr-1" />Cancel</Button>}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Progress" value={`${pct.toFixed(0)}%`} sub={`${wo.produced_quantity} / ${wo.planned_quantity} ${wo.unit}`} />
        <StatCard label="Material cost" value={`₹${totalMatCost.toFixed(2)}`} sub={`${materials?.length ?? 0} entries`} />
        <StatCard label="Output (good)" value={`${totalOutput} ${wo.unit}`} sub={`${outputs?.filter((o) => o.is_scrap).length ?? 0} scrap entries`} />
        <StatCard label="COGS / unit" value={`₹${cogsPerUnit.toFixed(2)}`} sub="Material cost / good output" highlight />
      </div>

      {required && required.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" />Required materials (BOM explosion)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {required.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md border border-border text-sm">
                  <div>
                    <div className="font-medium">{r.material_name}</div>
                    {r.material_code && <div className="text-xs text-muted-foreground">{r.material_code}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{Number(r.total_quantity).toFixed(3)} {r.unit}</div>
                    <div className="text-xs text-muted-foreground">₹{Number(r.total_cost).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Material consumption</CardTitle>
            {canEdit && wo.status !== "cancelled" && (
              <Dialog open={matOpen} onOpenChange={setMatOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Record</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Record material consumed</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div><Label>Material *</Label><Input value={matForm.material_name} onChange={(e) => setMatForm({ ...matForm, material_name: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Code</Label><Input value={matForm.material_code} onChange={(e) => setMatForm({ ...matForm, material_code: e.target.value })} /></div>
                      <div><Label>Quantity</Label><Input type="number" step="0.001" value={matForm.quantity} onChange={(e) => setMatForm({ ...matForm, quantity: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Unit</Label><Input value={matForm.unit} onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })} /></div>
                      <div><Label>Unit cost (₹)</Label><Input type="number" step="0.01" value={matForm.unit_cost} onChange={(e) => setMatForm({ ...matForm, unit_cost: e.target.value })} /></div>
                    </div>
                  </div>
                  <DialogFooter><Button variant="outline" onClick={() => setMatOpen(false)}>Cancel</Button><Button onClick={recordMaterial}>Save</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {materials?.length ? (
              <div className="space-y-2">
                {materials.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-md border border-border text-sm">
                    <div>
                      <div className="font-medium">{m.material_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(m.consumed_at).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div>{m.quantity} {m.unit}</div>
                      <div className="text-xs text-muted-foreground">₹{Number(m.total_cost).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-sm text-muted-foreground py-6 text-center">No consumption recorded.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Boxes className="h-4 w-4" />Production output</CardTitle>
            {canEdit && wo.status !== "cancelled" && (
              <Dialog open={outOpen} onOpenChange={setOutOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Record</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Record finished output</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div><Label>Quantity ({wo.unit})</Label><Input type="number" step="0.001" value={outForm.quantity} onChange={(e) => setOutForm({ ...outForm, quantity: e.target.value })} /></div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={outForm.is_scrap} onChange={(e) => setOutForm({ ...outForm, is_scrap: e.target.checked })} />
                      Mark as scrap (won't count toward produced)
                    </label>
                    <div><Label>Notes</Label><Textarea value={outForm.notes} onChange={(e) => setOutForm({ ...outForm, notes: e.target.value })} /></div>
                  </div>
                  <DialogFooter><Button variant="outline" onClick={() => setOutOpen(false)}>Cancel</Button><Button onClick={recordOutput}>Save</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {outputs?.length ? (
              <div className="space-y-2">
                {outputs.map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-2 rounded-md border border-border text-sm">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {o.quantity} {o.unit}
                        {o.is_scrap && <Badge variant="destructive" className="text-[10px]">scrap</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(o.produced_at).toLocaleString()}</div>
                    </div>
                    {o.notes && <div className="text-xs text-muted-foreground max-w-[50%] truncate">{o.notes}</div>}
                  </div>
                ))}
              </div>
            ) : <div className="text-sm text-muted-foreground py-6 text-center">No output recorded.</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />Activity log</CardTitle></CardHeader>
        <CardContent>
          {logs?.length ? (
            <div className="space-y-3">
              {logs.map((l) => (
                <div key={l.id} className="flex items-start gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-accent mt-1.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{l.event}</span>
                      {l.from_status && l.to_status && (
                        <span className="text-xs text-muted-foreground">{l.from_status} → {l.to_status}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-muted-foreground py-6 text-center">No events yet.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className={`mt-1 text-xl font-bold ${highlight ? "text-accent" : ""}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}