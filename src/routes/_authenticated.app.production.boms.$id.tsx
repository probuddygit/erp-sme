import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, GitBranch, Layers, Package, Boxes } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/production/boms/$id")({
  component: BomDetailPage,
});

interface BomComponent {
  id: string;
  component_name: string;
  component_code: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  sub_bom_id: string | null;
  position: number;
}

interface BomNode {
  id: string;
  product_name: string;
  product_code: string | null;
  version: string;
  output_quantity: number;
  output_unit: string;
  status: string;
  notes: string | null;
}

function BomDetailPage() {
  const { id } = Route.useParams();
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("production");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ component_name: "", component_code: "", quantity: "1", unit: "pcs", unit_cost: "0", sub_bom_id: "none" });

  const { data: bom } = useQuery({
    enabled: !!company?.id,
    queryKey: ["bom", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bills_of_materials").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as BomNode | null;
    },
  });

  const { data: components } = useQuery({
    enabled: !!company?.id,
    queryKey: ["bom-components", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bom_components")
        .select("*")
        .eq("bom_id", id)
        .order("position");
      if (error) throw error;
      return data as BomComponent[];
    },
  });

  const { data: allBoms } = useQuery({
    enabled: !!company?.id,
    queryKey: ["all-boms", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills_of_materials")
        .select("id, product_name, version")
        .eq("company_id", company!.id)
        .neq("id", id);
      if (error) throw error;
      return data as { id: string; product_name: string; version: string }[];
    },
  });

  // BOM explosion (recursive raw materials)
  const { data: exploded } = useQuery({
    enabled: !!company?.id && !!bom,
    queryKey: ["bom-explode", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("explode_bom", { _bom_id: id, _qty: bom!.output_quantity });
      if (error) throw error;
      return data as { material_name: string; material_code: string | null; unit: string; total_quantity: number; total_cost: number }[];
    },
  });

  const addComponent = async () => {
    if (!form.component_name.trim()) {
      toast.error("Component name is required");
      return;
    }
    const position = (components?.length ?? 0) + 1;
    const { error } = await supabase.from("bom_components").insert({
      company_id: company!.id,
      bom_id: id,
      component_name: form.component_name.trim(),
      component_code: form.component_code.trim() || null,
      quantity: Number(form.quantity) || 1,
      unit: form.unit.trim() || "pcs",
      unit_cost: Number(form.unit_cost) || 0,
      sub_bom_id: form.sub_bom_id === "none" ? null : form.sub_bom_id,
      position,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Component added");
    setOpen(false);
    setForm({ component_name: "", component_code: "", quantity: "1", unit: "pcs", unit_cost: "0", sub_bom_id: "none" });
    qc.invalidateQueries({ queryKey: ["bom-components", id] });
    qc.invalidateQueries({ queryKey: ["bom-explode", id] });
  };

  const removeComponent = async (cid: string) => {
    const { error } = await supabase.from("bom_components").delete().eq("id", cid);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["bom-components", id] });
    qc.invalidateQueries({ queryKey: ["bom-explode", id] });
  };

  const activateBom = async () => {
    const { error } = await supabase.from("bills_of_materials").update({ status: "active" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("BOM activated");
    qc.invalidateQueries({ queryKey: ["bom", id] });
  };

  if (!bom) return <div className="text-muted-foreground">Loading…</div>;

  const directCost = (components ?? []).reduce((s, c) => s + Number(c.quantity) * Number(c.unit_cost), 0);
  const explodedCost = (exploded ?? []).reduce((s, r) => s + Number(r.total_cost), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/production/boms"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-accent" />
            <h2 className="text-2xl font-bold">{bom.product_name}</h2>
            <Badge variant="outline">{bom.version}</Badge>
            <Badge variant={bom.status === "active" ? "default" : "secondary"}>{bom.status}</Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Output: {bom.output_quantity} {bom.output_unit}{bom.product_code && ` · Code ${bom.product_code}`}
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && bom.status !== "active" && (
            <Button onClick={activateBom}>Activate BOM</Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" />Components</CardTitle>
            {canEdit && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add component</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div>
                      <Label>Component name *</Label>
                      <Input value={form.component_name} onChange={(e) => setForm({ ...form, component_name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Code</Label>
                        <Input value={form.component_code} onChange={(e) => setForm({ ...form, component_code: e.target.value })} />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input type="number" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Unit</Label>
                        <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                      </div>
                      <div>
                        <Label>Unit cost</Label>
                        <Input type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label>Sub-assembly (optional)</Label>
                      <Select value={form.sub_bom_id} onValueChange={(v) => setForm({ ...form, sub_bom_id: v })}>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (raw material)</SelectItem>
                          {allBoms?.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.product_name} ({b.version})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={addComponent}>Add</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {components?.length ? (
              <div className="space-y-2">
                {components.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-card hover:bg-muted/30">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${c.sub_bom_id ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
                      {c.sub_bom_id ? <Boxes className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {c.component_name}
                        {c.sub_bom_id && <Badge variant="outline" className="text-[10px]">sub-assembly</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.quantity} {c.unit} × ₹{Number(c.unit_cost).toFixed(2)} = ₹{(Number(c.quantity) * Number(c.unit_cost)).toFixed(2)}
                      </div>
                    </div>
                    {canEdit && (
                      <Button size="icon" variant="ghost" onClick={() => removeComponent(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <div className="pt-3 mt-3 border-t border-border flex justify-between text-sm">
                  <span className="text-muted-foreground">Direct material cost</span>
                  <span className="font-semibold">₹{directCost.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">No components yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Boxes className="h-4 w-4" />Exploded raw materials</CardTitle>
          </CardHeader>
          <CardContent>
            {exploded?.length ? (
              <div className="space-y-2">
                {exploded.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md border border-border">
                    <div>
                      <div className="font-medium text-sm">{r.material_name}</div>
                      {r.material_code && <div className="text-xs text-muted-foreground">{r.material_code}</div>}
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">{Number(r.total_quantity).toFixed(3)} {r.unit}</div>
                      <div className="text-xs text-muted-foreground">₹{Number(r.total_cost).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
                <div className="pt-3 mt-3 border-t border-border flex justify-between text-sm">
                  <span className="text-muted-foreground">Total raw material cost (per BOM run)</span>
                  <span className="font-semibold text-accent">₹{explodedCost.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Add components to see the multi-level explosion.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {bom.notes && (
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Notes</div>
            <p className="text-sm whitespace-pre-wrap">{bom.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}