import { createFileRoute } from "@tanstack/react-router";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileQuestion, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/procurement/rfqs")({
  component: RfqsPage,
});

function RfqsPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("procurement");
  const [open, setOpen] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<string | null>(null);
  const [items, setItems] = useState<{ name: string; qty: string; unit: string }[]>([{ name: "", qty: "1", unit: "pcs" }]);
  const [dueDate, setDueDate] = useState("");

  const { data: rfqs } = useQuery({
    enabled: !!company?.id,
    queryKey: ["rfqs", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rfqs").select("*").eq("company_id", company!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = async () => {
    const valid = items.filter(i => i.name.trim());
    if (valid.length === 0) { toast.error("Add at least one item"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { data: num } = await supabase.rpc("next_proc_number", { _company_id: company!.id, _prefix: "RFQ" });
    const { data: r, error } = await supabase.from("rfqs").insert({
      company_id: company!.id, rfq_number: num as string, status: "sent", due_date: dueDate || null, created_by: u.user?.id ?? null,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("rfq_items").insert(valid.map((it, idx) => ({
      company_id: company!.id, rfq_id: r!.id, item_name: it.name.trim(), quantity: Number(it.qty) || 1, unit: it.unit.trim() || "pcs", position: idx,
    })));
    toast.success(`RFQ ${num} created`);
    setOpen(false); setItems([{ name: "", qty: "1", unit: "pcs" }]); setDueDate("");
    qc.invalidateQueries({ queryKey: ["rfqs"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Requests for Quotation</h2>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New RFQ</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Create RFQ</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Quote due date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Items</Label>
                  {items.map((it, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_80px_36px] gap-2">
                      <Input placeholder="Item name" value={it.name} onChange={e => { const c = [...items]; c[i].name = e.target.value; setItems(c); }} />
                      <Input type="number" value={it.qty} onChange={e => { const c = [...items]; c[i].qty = e.target.value; setItems(c); }} />
                      <Input value={it.unit} onChange={e => { const c = [...items]; c[i].unit = e.target.value; setItems(c); }} />
                      <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setItems([...items, { name: "", qty: "1", unit: "pcs" }])}><Plus className="h-3 w-3 mr-1" />Add line</Button>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>RFQ #</TableHead><TableHead>Status</TableHead><TableHead>Issued</TableHead><TableHead>Due</TableHead><TableHead className="w-32"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(rfqs?.length ?? 0) === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12"><FileQuestion className="h-8 w-8 mx-auto mb-2 opacity-50" />No RFQs yet.</TableCell></TableRow>
              ) : rfqs!.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.rfq_number}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.issue_date}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.due_date ?? "—"}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => setSelectedRfq(r.id)}>Compare</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedRfq && <SupplierComparison rfqId={selectedRfq} onClose={() => setSelectedRfq(null)} canEdit={canEdit} />}
    </div>
  );
}

function SupplierComparison({ rfqId, onClose, canEdit }: { rfqId: string; onClose: () => void; canEdit: boolean }) {
  const { company } = useAuth();
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState<string>("");

  const { data } = useQuery({
    enabled: !!company?.id,
    queryKey: ["rfq-detail", rfqId],
    queryFn: async () => {
      const [{ data: items }, { data: quotes }, { data: suppliers }] = await Promise.all([
        supabase.from("rfq_items").select("*").eq("rfq_id", rfqId).order("position"),
        supabase.from("rfq_supplier_quotes").select("*").eq("rfq_id", rfqId),
        supabase.from("suppliers").select("id, name").eq("company_id", company!.id).eq("is_active", true),
      ]);
      return { items: items ?? [], quotes: quotes ?? [], suppliers: suppliers ?? [] };
    },
  });

  const setQuote = async (rfq_item_id: string, sid: string, price: string) => {
    const existing = data?.quotes.find((q: any) => q.rfq_item_id === rfq_item_id && q.supplier_id === sid);
    if (existing) {
      await supabase.from("rfq_supplier_quotes").update({ unit_price: Number(price) || 0 }).eq("id", existing.id);
    } else {
      await supabase.from("rfq_supplier_quotes").insert({ company_id: company!.id, rfq_id: rfqId, supplier_id: sid, rfq_item_id, unit_price: Number(price) || 0 });
    }
    qc.invalidateQueries({ queryKey: ["rfq-detail", rfqId] });
  };

  const selectQuote = async (q: any) => {
    await supabase.from("rfq_supplier_quotes").update({ is_selected: false }).eq("rfq_id", rfqId).eq("rfq_item_id", q.rfq_item_id);
    await supabase.from("rfq_supplier_quotes").update({ is_selected: true }).eq("id", q.id);
    qc.invalidateQueries({ queryKey: ["rfq-detail", rfqId] });
    toast.success("Quote selected");
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Supplier comparison</DialogTitle></DialogHeader>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Label className="text-xs">Add quote from supplier:</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>{data?.suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <Table>
          <TableHeader><TableRow>
            <TableHead>Item</TableHead><TableHead>Qty</TableHead>
            {data?.suppliers.map((s: any) => <TableHead key={s.id}>{s.name}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {data?.items.map((it: any) => {
              const itemQuotes = data.quotes.filter((q: any) => q.rfq_item_id === it.id);
              const minPrice = Math.min(...itemQuotes.map((q: any) => Number(q.unit_price)).filter((n: number) => n > 0));
              return (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.item_name}</TableCell>
                  <TableCell className="text-xs">{it.quantity} {it.unit}</TableCell>
                  {data.suppliers.map((s: any) => {
                    const q = itemQuotes.find((qq: any) => qq.supplier_id === s.id);
                    const isMin = q && Number(q.unit_price) === minPrice && minPrice > 0;
                    return (
                      <TableCell key={s.id}>
                        <div className="flex items-center gap-1">
                          <Input className={`h-8 w-24 ${isMin ? "border-emerald-500" : ""}`} type="number"
                            defaultValue={q?.unit_price ?? ""} disabled={!canEdit && !q}
                            onBlur={(e) => canEdit && setQuote(it.id, s.id, e.target.value)} />
                          {q && canEdit && (
                            <Button size="icon" variant={q.is_selected ? "default" : "ghost"} className="h-7 w-7" onClick={() => selectQuote(q)}><Check className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}