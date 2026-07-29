import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Check, X, Receipt } from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/lib/sales-utils";
import { RowActions } from "@/components/RowActions";
import type { Database } from "@/integrations/supabase/types";

type SOStatus = Database["public"]["Enums"]["sales_order_status"];

interface OrderRow {
  id: string;
  order_number: string;
  status: SOStatus;
  order_date: string;
  delivery_date: string | null;
  grand_total: number;
  customer_id: string;
  tax_type: Database["public"]["Enums"]["tax_type"];
  subtotal: number;
  discount_total: number;
  tax_total: number;
  customers: { name: string } | null;
}

const STATUS_VARIANT: Record<SOStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  approved: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  rejected: "bg-red-500/15 text-red-600 dark:text-red-400",
  fulfilled: "bg-green-500/15 text-green-600 dark:text-green-400",
  cancelled: "bg-muted text-muted-foreground",
  partially_dispatched: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  dispatched: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  invoiced: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  closed: "bg-muted text-muted-foreground",
  credit_hold: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export const Route = createFileRoute("/_authenticated/app/sales/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { company, user, isCompanyAdmin, hasRole } = useAuth();
  const qc = useQueryClient();
  const canEditFinance = isCompanyAdmin || hasRole("finance") || hasRole("sales");

  const { data: orders, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["sales-orders", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select("id,order_number,status,order_date,delivery_date,grand_total,subtotal,discount_total,tax_total,tax_type,customer_id,customers(name)")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OrderRow[];
    },
  });

  const setStatus = async (id: string, status: SOStatus) => {
    const patch =
      status === "approved"
        ? { status, approved_by: user?.id, approved_at: new Date().toISOString() }
        : { status };
    const { error } = await supabase.from("sales_orders").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Order ${status.replace("_", " ")}`);
      qc.invalidateQueries({ queryKey: ["sales-orders", company?.id] });
    }
  };

  const generateInvoice = async (o: OrderRow) => {
    if (!company?.id) return;
    const { data: items } = await supabase.from("sales_order_items").select("*").eq("sales_order_id", o.id);
    const { data: num } = await supabase.rpc("next_doc_number", { _company_id: company.id, _prefix: "INV" });

    let cgst_total = 0, sgst_total = 0, igst_total = 0;
    const itemRows = (items ?? []).map((it, i) => {
      const gross = Number(it.quantity) * Number(it.unit_price);
      const disc = gross * (Number(it.discount_percent) / 100);
      const taxable = gross - disc;
      const tax = taxable * (Number(it.tax_percent) / 100);
      let cgst = 0, sgst = 0, igst = 0;
      if (o.tax_type === "intra_state") { cgst = tax / 2; sgst = tax / 2; }
      else if (o.tax_type === "inter_state") { igst = tax; }
      cgst_total += cgst; sgst_total += sgst; igst_total += igst;
      return {
        company_id: company.id,
        product_name: it.product_name,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_percent: it.discount_percent,
        tax_percent: it.tax_percent,
        cgst_amount: Math.round(cgst * 100) / 100,
        sgst_amount: Math.round(sgst * 100) / 100,
        igst_amount: Math.round(igst * 100) / 100,
        line_total: Math.round((taxable + tax) * 100) / 100,
        position: i,
      };
    });

    const due = new Date();
    due.setDate(due.getDate() + 30);

    const { data: inv, error } = await supabase.from("invoices").insert({
      company_id: company.id,
      created_by: user?.id,
      invoice_number: num as string,
      customer_id: o.customer_id,
      sales_order_id: o.id,
      status: "draft",
      tax_type: o.tax_type,
      subtotal: o.subtotal,
      discount_total: o.discount_total,
      tax_total: o.tax_total,
      cgst_total: Math.round(cgst_total * 100) / 100,
      sgst_total: Math.round(sgst_total * 100) / 100,
      igst_total: Math.round(igst_total * 100) / 100,
      grand_total: o.grand_total,
      amount_due: o.grand_total,
      due_date: due.toISOString().slice(0, 10),
    }).select().single();
    if (error) return toast.error(error.message);
    if (itemRows.length) {
      await supabase.from("invoice_items").insert(itemRows.map((r) => ({ ...r, invoice_id: inv.id })));
    }
    await supabase.from("sales_orders").update({ status: "fulfilled" }).eq("id", o.id);
    toast.success(`Invoice ${num} created`);
    qc.invalidateQueries({ queryKey: ["sales-orders", company?.id] });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Order date</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>}
            {!isLoading && (orders ?? []).length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                <ClipboardList className="mx-auto h-8 w-8 mb-2 opacity-50" />
                No sales orders yet — create one from a quotation
              </TableCell></TableRow>
            )}
            {(orders ?? []).map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                <TableCell>{o.customers?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{o.order_date}</TableCell>
                <TableCell className="text-muted-foreground">{o.delivery_date ?? "—"}</TableCell>
                <TableCell><Badge variant="secondary" className={STATUS_VARIANT[o.status]}>{o.status.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-right font-medium tabular-nums">{inr(o.grand_total)}</TableCell>
                <TableCell className="text-right space-x-1">
                  {isCompanyAdmin && o.status === "pending_approval" && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setStatus(o.id, "approved")}>
                        <Check className="h-3.5 w-3.5 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStatus(o.id, "rejected")}>
                        <X className="h-3.5 w-3.5 mr-1" />Reject
                      </Button>
                    </>
                  )}
                  {canEditFinance && o.status === "approved" && (
                    <Button size="sm" variant="ghost" onClick={() => generateInvoice(o)}>
                      <Receipt className="h-3.5 w-3.5 mr-1" />Invoice
                    </Button>
                  )}
                  {canEditFinance && (o.status === "draft" || o.status === "rejected" || o.status === "cancelled" || o.status === "pending_approval") && (
                    <RowActions
                      label={`order ${o.order_number}`}
                      invalidateKeys={[["sales-orders", company?.id]]}
                      onDelete={async () => {
                        await supabase.from("sales_order_items").delete().eq("sales_order_id", o.id);
                        const { error } = await supabase.from("sales_orders").delete().eq("id", o.id);
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
  );
}
