import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";

export const Route = createFileRoute("/_authenticated/app/maintenance/spares")({
  component: SparesPage,
});

type Item = { id: string; sku: string; name: string; unit: string; min_stock: number; standard_cost: number };
type Machine = { id: string; name: string; machine_code: string };
type Link = { id: string; item_id: string; machine_id: string; reorder_level: number | null; notes: string | null };
type Usage = {
  id: string; ticket_id: string | null; machine_id: string | null; item_id: string;
  quantity: number; unit_cost: number; used_at: string; notes: string | null;
};
type Level = { item_id: string; warehouse_id: string; on_hand: number; value: number };

function SparesPage() {
  const { company, isCompanyAdmin, hasRole } = useAuth();
  const qc = useQueryClient();
  const canManage = isCompanyAdmin || hasRole("maintenance") || hasRole("procurement");
  const canLog = isCompanyAdmin || hasRole("maintenance") || hasRole("production");

  const [linkOpen, setLinkOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ item_id: "", machine_id: "", reorder_level: "", notes: "" });
  const [usageForm, setUsageForm] = useState({
    item_id: "", machine_id: "", ticket_id: "", quantity: "1", unit_cost: "0", notes: "",
  });

  const { data: items } = useQuery({
    enabled: !!company?.id,
    queryKey: ["spare-items", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id, sku, name, unit, min_stock, standard_cost")
        .eq("company_id", company!.id).eq("is_active", true).order("name");
      if (error) throw error;
      return data as Item[];
    },
  });

  const { data: machines } = useQuery({
    enabled: !!company?.id,
    queryKey: ["spare-machines", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("machines").select("id, name, machine_code")
        .eq("company_id", company!.id).order("name");
      if (error) throw error;
      return data as Machine[];
    },
  });

  const { data: links } = useQuery({
    enabled: !!company?.id,
    queryKey: ["spare-links", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("machine_spare_parts").select("*").eq("company_id", company!.id);
      if (error) throw error;
      return data as Link[];
    },
  });

  const { data: usage } = useQuery({
    enabled: !!company?.id,
    queryKey: ["spare-usage", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance_spare_usage").select("*")
        .eq("company_id", company!.id).order("used_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as Usage[];
    },
  });

  const { data: levels } = useQuery({
    enabled: !!company?.id,
    queryKey: ["spare-levels", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("item_stock_levels", { _company_id: company!.id });
      if (error) throw error;
      return (data ?? []) as Level[];
    },
  });

  const itemMap = useMemo(() => new Map((items ?? []).map(i => [i.id, i])), [items]);
  const machineMap = useMemo(() => new Map((machines ?? []).map(m => [m.id, m])), [machines]);

  // Aggregate stock per item
  const stockByItem = useMemo(() => {
    const map = new Map<string, number>();
    (levels ?? []).forEach((l) => {
      map.set(l.item_id, (map.get(l.item_id) ?? 0) + Number(l.on_hand));
    });
    return map;
  }, [levels]);

  // Spare parts catalog: items that are linked to at least one machine
  const catalog = useMemo(() => {
    const linkedItemIds = new Set((links ?? []).map(l => l.item_id));
    const lastUsedMap = new Map<string, string>();
    (usage ?? []).forEach(u => {
      if (!lastUsedMap.has(u.item_id)) lastUsedMap.set(u.item_id, u.used_at);
    });
    return (items ?? []).filter(i => linkedItemIds.has(i.id)).map(i => {
      const onHand = stockByItem.get(i.id) ?? 0;
      const itemLinks = (links ?? []).filter(l => l.item_id === i.id);
      const reorder = Math.max(
        Number(i.min_stock) || 0,
        ...itemLinks.map(l => Number(l.reorder_level ?? 0)),
      );
      return {
        ...i,
        on_hand: onHand,
        reorder_level: reorder,
        machines: itemLinks.map(l => machineMap.get(l.machine_id)).filter(Boolean) as Machine[],
        last_used: lastUsedMap.get(i.id) ?? null,
        low: reorder > 0 && onHand < reorder,
      };
    });
  }, [items, links, stockByItem, usage, machineMap]);

  const lowStockCount = catalog.filter(c => c.low).length;

  const addLink = async () => {
    if (!linkForm.item_id || !linkForm.machine_id) { toast.error("Select item and machine"); return; }
    const { error } = await supabase.from("machine_spare_parts").insert({
      company_id: company!.id,
      item_id: linkForm.item_id,
      machine_id: linkForm.machine_id,
      reorder_level: linkForm.reorder_level ? Number(linkForm.reorder_level) : null,
      notes: linkForm.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Spare linked");
    setLinkOpen(false);
    setLinkForm({ item_id: "", machine_id: "", reorder_level: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["spare-links"] });
  };

  const logUsage = async () => {
    if (!usageForm.item_id || Number(usageForm.quantity) <= 0) { toast.error("Select item and quantity"); return; }
    const { error } = await supabase.from("maintenance_spare_usage").insert({
      company_id: company!.id,
      item_id: usageForm.item_id,
      machine_id: usageForm.machine_id || null,
      ticket_id: usageForm.ticket_id || null,
      quantity: Number(usageForm.quantity),
      unit_cost: Number(usageForm.unit_cost) || 0,
      notes: usageForm.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Spare usage logged");
    setUsageOpen(false);
    setUsageForm({ item_id: "", machine_id: "", ticket_id: "", quantity: "1", unit_cost: "0", notes: "" });
    qc.invalidateQueries({ queryKey: ["spare-usage"] });
    qc.invalidateQueries({ queryKey: ["spare-levels"] });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Spare SKUs" value={String(catalog.length)} icon={<Package className="h-4 w-4" />} />
        <Stat label="Low stock" value={String(lowStockCount)} tone={lowStockCount > 0 ? "warn" : undefined} />
        <Stat label="Usage entries" value={String(usage?.length ?? 0)} />
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="usage">Usage history</TabsTrigger>
          <TabsTrigger value="low">Low stock</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-3">
          <div className="flex justify-end gap-2">
            {canManage && (
              <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Link spare</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Link spare to machine</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div>
                      <Label>Inventory item *</Label>
                      <Select value={linkForm.item_id} onValueChange={(v) => setLinkForm({ ...linkForm, item_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>{(items ?? []).map(i => <SelectItem key={i.id} value={i.id}>{i.sku} — {i.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Machine *</Label>
                      <Select value={linkForm.machine_id} onValueChange={(v) => setLinkForm({ ...linkForm, machine_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
                        <SelectContent>{(machines ?? []).map(m => <SelectItem key={m.id} value={m.id}>{m.machine_code} — {m.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Reorder level</Label><Input type="number" step="0.01" value={linkForm.reorder_level} onChange={(e) => setLinkForm({ ...linkForm, reorder_level: e.target.value })} /></div>
                      <div><Label>Notes</Label><Input value={linkForm.notes} onChange={(e) => setLinkForm({ ...linkForm, notes: e.target.value })} /></div>
                    </div>
                  </div>
                  <DialogFooter><Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button><Button onClick={addLink}>Link</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {canLog && (
              <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Log usage</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log spare usage</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div>
                      <Label>Spare item *</Label>
                      <Select value={usageForm.item_id} onValueChange={(v) => {
                        const it = itemMap.get(v);
                        setUsageForm({ ...usageForm, item_id: v, unit_cost: it ? String(it.standard_cost) : usageForm.unit_cost });
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>{(items ?? []).map(i => <SelectItem key={i.id} value={i.id}>{i.sku} — {i.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Machine</Label>
                      <Select value={usageForm.machine_id} onValueChange={(v) => setUsageForm({ ...usageForm, machine_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                        <SelectContent>{(machines ?? []).map(m => <SelectItem key={m.id} value={m.id}>{m.machine_code} — {m.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Quantity *</Label><Input type="number" step="0.01" value={usageForm.quantity} onChange={(e) => setUsageForm({ ...usageForm, quantity: e.target.value })} /></div>
                      <div><Label>Unit cost (₹)</Label><Input type="number" step="0.01" value={usageForm.unit_cost} onChange={(e) => setUsageForm({ ...usageForm, unit_cost: e.target.value })} /></div>
                    </div>
                    <div><Label>Notes</Label><Input value={usageForm.notes} onChange={(e) => setUsageForm({ ...usageForm, notes: e.target.value })} /></div>
                  </div>
                  <DialogFooter><Button variant="outline" onClick={() => setUsageOpen(false)}>Cancel</Button><Button onClick={logUsage}>Log</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Compatible machines</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="text-right">Reorder</TableHead>
                    <TableHead>Last used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalog.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.sku}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap gap-1">
                          {s.machines.map(m => <Badge key={m.id} variant="outline" className="text-[10px]">{m.machine_code}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={s.low ? "text-destructive font-semibold" : ""}>
                          {s.low && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                          {s.on_hand.toFixed(2)} {s.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{s.reorder_level.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.last_used ? new Date(s.last_used).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!catalog.length && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No spares linked to machines yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {!!(links?.length) && canManage && (
            <Card>
              <CardHeader><CardTitle className="text-base">Machine ↔ Spare links</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Machine</TableHead><TableHead className="text-right">Reorder</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(links ?? []).map(l => {
                      const it = itemMap.get(l.item_id);
                      const m = machineMap.get(l.machine_id);
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="text-sm">{it ? `${it.sku} — ${it.name}` : l.item_id}</TableCell>
                          <TableCell className="text-sm">{m ? `${m.machine_code} — ${m.name}` : l.machine_id}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{l.reorder_level ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <RowActions table="machine_spare_parts" id={l.id} label="spare link" invalidateKeys={[["spare-links", company?.id]]} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead>Machine</TableHead>
                  <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost</TableHead><TableHead>Notes</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(usage ?? []).map(u => {
                    const it = itemMap.get(u.item_id);
                    const m = u.machine_id ? machineMap.get(u.machine_id) : null;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs">{new Date(u.used_at).toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{it ? `${it.sku} — ${it.name}` : u.item_id}</TableCell>
                        <TableCell className="text-sm">{m ? m.name : "—"}</TableCell>
                        <TableCell className="text-right">{Number(u.quantity).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{(Number(u.quantity) * Number(u.unit_cost)).toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{u.notes ?? ""}</TableCell>
                      </TableRow>
                    );
                  })}
                  {!(usage?.length) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No usage logged.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>SKU</TableHead><TableHead>Name</TableHead>
                  <TableHead className="text-right">On hand</TableHead><TableHead className="text-right">Reorder</TableHead><TableHead>Machines</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {catalog.filter(c => c.low).map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.sku}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right text-destructive font-semibold">{s.on_hand.toFixed(2)} {s.unit}</TableCell>
                      <TableCell className="text-right">{s.reorder_level.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{s.machines.map(m => m.machine_code).join(", ")}</TableCell>
                    </TableRow>
                  ))}
                  {!lowStockCount && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">All spares above reorder level.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: string; tone?: "warn"; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          {icon}
        </div>
        <div className={`mt-2 text-2xl font-bold tracking-tight ${tone === "warn" ? "text-amber-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}