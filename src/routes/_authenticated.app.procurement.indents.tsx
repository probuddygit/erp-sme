import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Sparkles, Plus, AlertTriangle, ArrowRight, FileQuestion } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";

export const Route = createFileRoute("/_authenticated/app/procurement/indents")({
  component: IndentsPage,
});

interface Indent { id: string; indent_number: string; status: string; required_by: string | null; source: string | null; created_at: string; }
interface ItemRow { id: string; name: string; sku: string; unit: string; min_stock: number; reorder_qty: number; on_hand: number; shortage: number; }

function IndentsPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("procurement");

  const { data: indents, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["indents", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_indents").select("*").eq("company_id", company!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Indent[];
    },
  });

  // MRP scan: items with min_stock > 0 and on-hand below min_stock
  const { data: mrp, refetch: refetchMrp } = useQuery({
    enabled: !!company?.id,
    queryKey: ["mrp-scan", company?.id],
    queryFn: async () => {
      const [{ data: items }, { data: levels }] = await Promise.all([
        supabase.from("items").select("id, name, sku, unit, min_stock, reorder_qty").eq("company_id", company!.id).gt("min_stock", 0),
        supabase.rpc("item_stock_levels", { _company_id: company!.id }),
      ]);
      const onHandByItem = new Map<string, number>();
      (levels as any[] | null)?.forEach((r) => {
        onHandByItem.set(r.item_id, (onHandByItem.get(r.item_id) ?? 0) + Number(r.on_hand));
      });
      const rows: ItemRow[] = (items ?? []).map((i: any) => {
        const oh = onHandByItem.get(i.id) ?? 0;
        const need = Number(i.min_stock) - oh;
        return {
          id: i.id, name: i.name, sku: i.sku, unit: i.unit,
          min_stock: Number(i.min_stock), reorder_qty: Number(i.reorder_qty ?? 0),
          on_hand: oh, shortage: need > 0 ? need : 0,
        };
      }).filter(r => r.shortage > 0);
      return rows;
    },
  });

  const [mrpOpen, setMrpOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const togglePick = (id: string) => {
    const ns = new Set(picked);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setPicked(ns);
  };

  const generateIndent = async () => {
    const rows = (mrp ?? []).filter(r => picked.has(r.id));
    if (rows.length === 0) { toast.error("Select at least one item"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { data: numData, error: nErr } = await supabase.rpc("next_proc_number", { _company_id: company!.id, _prefix: "INDENT" });
    if (nErr) { toast.error(nErr.message); return; }
    const { data: ind, error: iErr } = await supabase.from("purchase_indents").insert({
      company_id: company!.id, indent_number: numData as string, status: "submitted", source: "mrp", created_by: u.user?.id ?? null,
    }).select("id").single();
    if (iErr) { toast.error(iErr.message); return; }
    const { error: itErr } = await supabase.from("purchase_indent_items").insert(rows.map((r, idx) => ({
      company_id: company!.id, indent_id: ind!.id, item_id: r.id, item_name: r.name, item_code: r.sku, unit: r.unit,
      quantity: Math.max(r.shortage, r.reorder_qty), position: idx,
    })));
    if (itErr) { toast.error(itErr.message); return; }
    toast.success(`Indent ${numData} created with ${rows.length} item(s)`);
    setMrpOpen(false); setPicked(new Set());
    qc.invalidateQueries({ queryKey: ["indents"] });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" />Material Requirement Planning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Scan items where current on-hand stock has fallen below the minimum threshold. Generate an indent in one click.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10"><AlertTriangle className="h-3 w-3 mr-1" />{mrp?.length ?? 0} items short</Badge>
              {canEdit && (
                <Dialog open={mrpOpen} onOpenChange={(v) => { setMrpOpen(v); if (v) refetchMrp(); }}>
                  <DialogTrigger asChild><Button size="sm">Run MRP scan</Button></DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader><DialogTitle>MRP — items below minimum stock</DialogTitle></DialogHeader>
                    {(mrp?.length ?? 0) === 0 ? (
                      <div className="py-6 text-sm text-muted-foreground text-center">All tracked items are at or above their minimum stock level.</div>
                    ) : (
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead className="w-8"></TableHead><TableHead>Item</TableHead><TableHead>On hand</TableHead><TableHead>Min</TableHead><TableHead>Shortage</TableHead><TableHead>Suggested qty</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {mrp!.map((r) => (
                            <TableRow key={r.id} className="cursor-pointer" onClick={() => togglePick(r.id)}>
                              <TableCell><input type="checkbox" checked={picked.has(r.id)} onChange={() => togglePick(r.id)} /></TableCell>
                              <TableCell><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.sku}</div></TableCell>
                              <TableCell className="text-sm">{r.on_hand} {r.unit}</TableCell>
                              <TableCell className="text-sm">{r.min_stock}</TableCell>
                              <TableCell className="text-sm text-amber-600">{r.shortage}</TableCell>
                              <TableCell className="text-sm font-medium">{Math.max(r.shortage, r.reorder_qty)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setMrpOpen(false)}>Cancel</Button>
                      <Button onClick={generateIndent} disabled={picked.size === 0}>Create indent ({picked.size})</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">How it flows</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge>Indent</Badge><ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline">RFQ to suppliers</Badge><ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline">Compare quotes</Badge><ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline">Purchase Order</Badge><ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline">Goods Receipt</Badge><ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline">Vendor Invoice</Badge><ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline">Payment</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Indent #</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead><TableHead>Required by</TableHead><TableHead>Created</TableHead><TableHead className="w-32"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : (indents?.length ?? 0) === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />No indents yet. Run an MRP scan to create one.
                </TableCell></TableRow>
              ) : indents!.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.indent_number}</TableCell>
                  <TableCell><Badge variant="outline">{i.source ?? "manual"}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{i.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{i.required_by ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="ghost"><Link to="/app/procurement/rfqs" search={{ from_indent: i.id } as any}><FileQuestion className="h-3.5 w-3.5 mr-1" />RFQ</Link></Button>
                    {canEdit && (i.status === "draft" || i.status === "submitted" || i.status === "rejected") && (
                      <RowActions
                        label={`indent ${i.indent_number}`}
                        invalidateKeys={[["indents", company?.id]]}
                        onDelete={async () => {
                          await supabase.from("purchase_indent_items").delete().eq("indent_id", i.id);
                          const { error } = await supabase.from("purchase_indents").delete().eq("id", i.id);
                          if (error) throw error;
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}