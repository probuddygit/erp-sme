import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";
import { computeTotals, inr } from "@/lib/sales-utils";
import { LineItemsEditor, emptyLine, type EditableLine } from "@/components/sales/LineItemsEditor";
import type { Database } from "@/integrations/supabase/types";

type QStatus = Database["public"]["Enums"]["quotation_status"];
type TaxType = Database["public"]["Enums"]["tax_type"];

interface QuotationRow {
  id: string;
  quotation_number: string;
  status: QStatus;
  issue_date: string;
  valid_until: string | null;
  grand_total: number;
  customer_id: string;
  customers: { name: string } | null;
}

const STATUS_VARIANT: Record<QStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  accepted: "bg-green-500/15 text-green-600 dark:text-green-400",
  rejected: "bg-red-500/15 text-red-600 dark:text-red-400",
  expired: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export const Route = createFileRoute("/_authenticated/app/sales/quotations")({
  component: QuotationsPage,
});

function QuotationsPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const canEdit = isCompanyAdmin || hasRole("sales");

  const { data: quotations, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["quotations", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select("id,quotation_number,status,issue_date,valid_until,grand_total,customer_id,customers(name)")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as QuotationRow[];
    },
  });

  const setStatus = async (id: string, status: QStatus) => {
    const { error } = await supabase.from("quotations").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["quotations", company?.id] });
  };

  const convertToOrder = async (q: QuotationRow) => {
    if (!company?.id) return;
    const { data: items, error: ie } = await supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", q.id);
    if (ie) return toast.error(ie.message);
    const { data: full } = await supabase.from("quotations").select("*").eq("id", q.id).single();
    if (!full) return;
    const { data: num } = await supabase.rpc("next_doc_number", { _company_id: company.id, _prefix: "SO" });
    const { data: so, error: se } = await supabase
      .from("sales_orders")
      .insert({
        company_id: company.id,
        order_number: num as string,
        customer_id: full.customer_id,
        quotation_id: q.id,
        status: "pending_approval",
        tax_type: full.tax_type,
        subtotal: full.subtotal,
        discount_total: full.discount_total,
        tax_total: full.tax_total,
        grand_total: full.grand_total,
      })
      .select()
      .single();
    if (se) return toast.error(se.message);
    if (items && items.length) {
      await supabase.from("sales_order_items").insert(
        items.map((it) => ({
          sales_order_id: so.id,
          company_id: company.id,
          product_name: it.product_name,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount_percent: it.discount_percent,
          tax_percent: it.tax_percent,
          line_total: it.line_total,
          position: it.position,
        })),
      );
    }
    await setStatus(q.id, "accepted");
    toast.success(`Sales order ${num} created`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New quotation</Button>
            </DialogTrigger>
            <QuotationDialog
              onClose={() => setOpen(false)}
              onSaved={() => {
                setOpen(false);
                qc.invalidateQueries({ queryKey: ["quotations", company?.id] });
              }}
            />
          </Dialog>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>}
              {!isLoading && (quotations ?? []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  No quotations yet
                </TableCell></TableRow>
              )}
              {(quotations ?? []).map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono text-xs">{q.quotation_number}</TableCell>
                  <TableCell>{q.customers?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{q.issue_date}</TableCell>
                  <TableCell className="text-muted-foreground">{q.valid_until ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_VARIANT[q.status]}>{q.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{inr(q.grand_total)}</TableCell>
                  <TableCell className="text-right">
                    {canEdit && q.status === "draft" && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(q.id, "sent")}>Send</Button>
                    )}
                    {canEdit && (q.status === "sent" || q.status === "draft") && (
                      <Button size="sm" variant="ghost" onClick={() => convertToOrder(q)}>
                        To Order <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canEdit && (q.status === "draft" || q.status === "rejected" || q.status === "expired") && (
                      <RowActions
                        label={`quotation ${q.quotation_number}`}
                        invalidateKeys={[["quotations", company?.id]]}
                        onDelete={async () => {
                          await supabase.from("quotation_items").delete().eq("quotation_id", q.id);
                          const { error } = await supabase.from("quotations").delete().eq("id", q.id);
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

function QuotationDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { company, user } = useAuth();
  const [customerId, setCustomerId] = useState<string>("");
  const [taxType, setTaxType] = useState<TaxType>("intra_state");
  const [validUntil, setValidUntil] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  const { data: customers } = useQuery({
    enabled: !!company?.id,
    queryKey: ["customers-min", company?.id],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id,name").eq("company_id", company!.id).order("name");
      return data ?? [];
    },
  });

  const submit = async () => {
    if (!company?.id) return;
    if (!customerId) return toast.error("Choose a customer");
    const valid = lines.filter((l) => l.product_name.trim() && l.quantity > 0);
    if (valid.length === 0) return toast.error("Add at least one line item");
    setSaving(true);
    const totals = computeTotals(valid, taxType);
    const { data: num } = await supabase.rpc("next_doc_number", { _company_id: company.id, _prefix: "QUO" });
    const { data: q, error } = await supabase
      .from("quotations")
      .insert({
        company_id: company.id,
        created_by: user?.id,
        quotation_number: num as string,
        customer_id: customerId,
        tax_type: taxType,
        valid_until: validUntil || null,
        notes: notes || null,
        subtotal: totals.subtotal,
        discount_total: totals.discount_total,
        tax_total: totals.tax_total,
        grand_total: totals.grand_total,
      })
      .select()
      .single();
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }
    const itemRows = valid.map((l, i) => {
      const gross = l.quantity * l.unit_price;
      const disc = gross * (l.discount_percent / 100);
      const taxable = gross - disc;
      const tax = taxable * (l.tax_percent / 100);
      return {
        quotation_id: q.id,
        company_id: company.id,
        product_name: l.product_name,
        description: l.description ?? null,
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_percent: l.discount_percent,
        tax_percent: l.tax_percent,
        line_total: Math.round((taxable + tax) * 100) / 100,
        position: i,
      };
    });
    const { error: ie } = await supabase.from("quotation_items").insert(itemRows);
    setSaving(false);
    if (ie) return toast.error(ie.message);
    toast.success(`Quotation ${num} created`);
    onSaved();
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>New quotation</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Customer *">
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {(customers ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tax type">
          <Select value={taxType} onValueChange={(v) => setTaxType(v as TaxType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="intra_state">Intra-state (CGST + SGST)</SelectItem>
              <SelectItem value="inter_state">Inter-state (IGST)</SelectItem>
              <SelectItem value="exempt">Exempt</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Valid until"><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></Field>
      </div>
      <LineItemsEditor lines={lines} setLines={setLines} taxType={taxType} />
      <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Create quotation"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
