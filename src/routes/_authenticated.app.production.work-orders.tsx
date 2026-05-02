import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ListChecks, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "./_authenticated.app.production.index";

export const Route = createFileRoute("/_authenticated/app/production/work-orders")({
  component: WorkOrdersPage,
});

interface WO {
  id: string;
  wo_number: string;
  product_name: string;
  planned_quantity: number;
  produced_quantity: number;
  unit: string;
  status: string;
  priority: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  bom_id: string | null;
  sales_order_id: string | null;
  auto_triggered: boolean;
}

function WorkOrdersPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("production") || hasRole("sales");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [form, setForm] = useState({
    bom_id: "none",
    sales_order_id: "none",
    product_name: "",
    planned_quantity: "1",
    unit: "pcs",
    priority: "5",
    scheduled_start: "",
    scheduled_end: "",
    notes: "",
  });

  const { data: wos, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["work-orders", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WO[];
    },
  });

  const { data: boms } = useQuery({
    enabled: !!company?.id,
    queryKey: ["boms-active", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills_of_materials")
        .select("id, product_name, version, output_unit")
        .eq("company_id", company!.id);
      if (error) throw error;
      return data as { id: string; product_name: string; version: string; output_unit: string }[];
    },
  });

  const { data: salesOrders } = useQuery({
    enabled: !!company?.id,
    queryKey: ["so-for-wo", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select("id, order_number")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as { id: string; order_number: string }[];
    },
  });

  const filtered = (wos ?? []).filter((w) => {
    if (statusFilter !== "all" && w.status !== statusFilter) return false;
    if (!search) return true;
    return [w.wo_number, w.product_name].some((v) => v?.toLowerCase().includes(search.toLowerCase()));
  });

  const onPickBom = (bomId: string) => {
    const b = boms?.find((x) => x.id === bomId);
    setForm((f) => ({
      ...f,
      bom_id: bomId,
      product_name: b?.product_name ?? f.product_name,
      unit: b?.output_unit ?? f.unit,
    }));
  };

  const createWO = async () => {
    if (!form.product_name.trim()) { toast.error("Product name is required"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { data: numData, error: numErr } = await supabase.rpc("next_wo_number", { _company_id: company!.id });
    if (numErr) { toast.error(numErr.message); return; }
    const { error } = await supabase.from("work_orders").insert({
      company_id: company!.id,
      wo_number: numData as string,
      bom_id: form.bom_id === "none" ? null : form.bom_id,
      sales_order_id: form.sales_order_id === "none" ? null : form.sales_order_id,
      product_name: form.product_name.trim(),
      planned_quantity: Number(form.planned_quantity) || 1,
      unit: form.unit.trim() || "pcs",
      priority: Number(form.priority) || 5,
      scheduled_start: form.scheduled_start || null,
      scheduled_end: form.scheduled_end || null,
      notes: form.notes.trim() || null,
      created_by: u.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Work order created");
    setOpen(false);
    setForm({ bom_id: "none", sales_order_id: "none", product_name: "", planned_quantity: "1", unit: "pcs", priority: "5", scheduled_start: "", scheduled_end: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["work-orders"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search work orders…" className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="released">Released</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />New work order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create work order</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>From BOM (optional)</Label>
                  <Select value={form.bom_id} onValueChange={onPickBom}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (manual)</SelectItem>
                      {boms?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.product_name} ({b.version})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Linked sales order (optional)</Label>
                  <Select value={form.sales_order_id} onValueChange={(v) => setForm({ ...form, sales_order_id: v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {salesOrders?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.order_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Product name *</Label>
                  <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" step="0.001" value={form.planned_quantity} onChange={(e) => setForm({ ...form, planned_quantity: e.target.value })} />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                  </div>
                  <div>
                    <Label>Priority (1-9)</Label>
                    <Input type="number" min="1" max="9" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Scheduled start</Label>
                    <Input type="date" value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} />
                  </div>
                  <div>
                    <Label>Scheduled end</Label>
                    <Input type="date" value={form.scheduled_end} onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={createWO}>Create</Button>
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
                <TableHead>WO #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No work orders. Create one to start production.
                </TableCell></TableRow>
              ) : filtered.map((w) => {
                const pct = w.planned_quantity > 0 ? Math.min(100, (Number(w.produced_quantity) / Number(w.planned_quantity)) * 100) : 0;
                return (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-1">
                        {w.wo_number}
                        {w.auto_triggered && <Sparkles className="h-3 w-3 text-accent" />}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{w.product_name}</TableCell>
                    <TableCell><StatusBadge status={w.status} /></TableCell>
                    <TableCell>
                      <div className="text-xs">{w.produced_quantity} / {w.planned_quantity} {w.unit}</div>
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-24">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {w.scheduled_start ?? "—"}<br />→ {w.scheduled_end ?? "—"}
                    </TableCell>
                    <TableCell><Badge variant="outline">P{w.priority}</Badge></TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/app/production/work-orders/$id" params={{ id: w.id }}><Eye className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}