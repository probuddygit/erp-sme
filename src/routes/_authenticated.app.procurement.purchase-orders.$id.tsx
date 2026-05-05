import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CheckCircle2, XCircle, Send, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { PoStatusBadge } from "./_authenticated.app.procurement.index";

export const Route = createFileRoute("/_authenticated/app/procurement/purchase-orders/$id")({
  component: PoDetailPage,
});

function PoDetailPage() {
  const { id } = Route.useParams();
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const canApprove = isCompanyAdmin || hasRole("finance");
  const canEdit = isCompanyAdmin || hasRole("procurement");
  const [notes, setNotes] = useState("");

  const { data } = useQuery({
    enabled: !!company?.id,
    queryKey: ["po-detail", id],
    queryFn: async () => {
      const [{ data: po }, { data: items }, { data: grns }, { data: invs }] = await Promise.all([
        supabase.from("purchase_orders").select("*, suppliers(name, email)").eq("id", id).single(),
        supabase.from("purchase_order_items").select("*").eq("po_id", id).order("position"),
        supabase.from("grns").select("id, grn_number, status, received_date, freight, duty, other_landed").eq("po_id", id).order("created_at", { ascending: false }),
        supabase.from("vendor_invoices").select("id, vinv_number, status, grand_total, amount_due, match_status").eq("po_id", id).order("created_at", { ascending: false }),
      ]);
      return { po, items: items ?? [], grns: grns ?? [], invs: invs ?? [] };
    },
  });

  if (!data?.po) return <div className="text-muted-foreground">Loading…</div>;
  const po = data.po as any;

  const setStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    const { data: u } = await supabase.auth.getUser();
    const patch: Record<string, unknown> = { status, ...extra };
    if (status === "approved") { patch.approved_by = u.user?.id; patch.approved_at = new Date().toISOString(); patch.approval_notes = notes || null; }
    if (status === "rejected") { patch.approval_notes = notes || null; }
    const { error } = await supabase.from("purchase_orders").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`PO ${status.replace("_", " ")}`);
    qc.invalidateQueries({ queryKey: ["po-detail", id] });
    qc.invalidateQueries({ queryKey: ["purchase-orders"] });
  };

  // 3-way match summary
  const totalOrdered = data.items.reduce((s, it: any) => s + Number(it.quantity), 0);
  const totalReceived = data.items.reduce((s, it: any) => s + Number(it.received_quantity), 0);
  const invoicedTotal = data.invs.reduce((s, v: any) => s + Number(v.grand_total), 0);
  const matchOk = totalReceived >= totalOrdered * 0.999 && Math.abs(invoicedTotal - Number(po.grand_total)) < 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2"><Link to="/app/procurement/purchase-orders"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
          <h2 className="text-2xl font-bold tracking-tight">{po.po_number}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{po.suppliers?.name}</span><span>·</span><PoStatusBadge status={po.status} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-widest">Grand total</div>
          <div className="text-2xl font-bold">₹{Number(po.grand_total).toLocaleString("en-IN")}</div>
        </div>
      </div>

      {po.status === "pending_approval" && canApprove && (
        <Card>
          <CardHeader><CardTitle className="text-base">Approval required</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea placeholder="Approval notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => setStatus("approved")}><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>
              <Button variant="destructive" onClick={() => setStatus("rejected")}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {po.status === "approved" && canEdit && (
        <Button variant="outline" onClick={() => setStatus("sent")}><Send className="h-4 w-4 mr-1" />Mark sent to supplier</Button>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line items</CardTitle>
          {(po.status === "approved" || po.status === "sent" || po.status === "partially_received") && canEdit && (
            <Button size="sm" onClick={() => nav({ to: "/app/procurement/grns", search: { po: po.id } as any })}>
              <PackageCheck className="h-4 w-4 mr-1" />Record GRN
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Received</TableHead><TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Tax%</TableHead><TableHead className="text-right">Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.items.map((it: any) => (
                <TableRow key={it.id}>
                  <TableCell>{it.item_name}</TableCell>
                  <TableCell className="text-right">{Number(it.quantity)}</TableCell>
                  <TableCell className="text-right">{Number(it.received_quantity)}</TableCell>
                  <TableCell className="text-right">₹{Number(it.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(it.tax_percent)}%</TableCell>
                  <TableCell className="text-right font-medium">₹{Number(it.line_total).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Goods receipts</CardTitle></CardHeader>
          <CardContent>
            {data.grns.length ? data.grns.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div><div className="font-mono text-xs">{g.grn_number}</div><div className="text-xs text-muted-foreground">{g.received_date}</div></div>
                <span className="text-xs px-2 py-0.5 rounded bg-muted">{g.status}</span>
              </div>
            )) : <div className="text-sm text-muted-foreground py-4 text-center">No goods received yet.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Vendor invoices</CardTitle></CardHeader>
          <CardContent>
            {data.invs.length ? data.invs.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div><div className="font-mono text-xs">{v.vinv_number}</div><div className="text-xs text-muted-foreground">Due ₹{Number(v.amount_due).toLocaleString("en-IN")}</div></div>
                <span className="text-xs px-2 py-0.5 rounded bg-muted">{v.status}</span>
              </div>
            )) : <div className="text-sm text-muted-foreground py-4 text-center">No invoices yet.</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">3-way match</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground">PO ordered qty</div><div className="font-semibold">{totalOrdered.toFixed(2)}</div></div>
            <div><div className="text-xs text-muted-foreground">GRN received qty</div><div className="font-semibold">{totalReceived.toFixed(2)}</div></div>
            <div><div className="text-xs text-muted-foreground">Invoiced amount</div><div className="font-semibold">₹{invoicedTotal.toLocaleString("en-IN")}</div></div>
          </div>
          <div className={`mt-3 inline-flex items-center gap-2 text-sm font-medium ${matchOk ? "text-emerald-600" : "text-amber-600"}`}>
            {matchOk ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {matchOk ? "PO, GRN and invoice match" : "Mismatch — review GRNs and invoices"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}