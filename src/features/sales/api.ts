import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import type { Database } from "@/integrations/supabase/types";
import { computeLine, computeTotals, type TaxType } from "@/lib/sales-utils";

type QuotationStatus = Database["public"]["Enums"]["quotation_status"];
type SalesOrderStatus = Database["public"]["Enums"]["sales_order_status"];
type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];
type DeliveryStatus = Database["public"]["Enums"]["delivery_note_status"];
type ReturnStatus = Database["public"]["Enums"]["sales_return_status"];
type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export interface DocLine {
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
}

// ---------- Shared masters ----------
export function useCustomers() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["sales", "customers", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, gst_number, state_code, billing_address, shipping_address")
        .eq("company_id", profile!.company_id!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useItemsMaster() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["sales", "items-master", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, sku, unit, standard_cost")
        .eq("company_id", profile!.company_id!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function genNumber(prefix: string) {
  const yy = new Date().getFullYear().toString().slice(-2);
  const rnd = Math.floor(Math.random() * 90000 + 10000);
  return `${prefix}-${yy}-${rnd}`;
}

async function nextDocNumber(companyId: string, prefix: string, fallbackPrefix: string) {
  const { data, error } = await supabase.rpc("next_doc_number", {
    _company_id: companyId,
    _prefix: prefix,
  });
  if (error || !data || (typeof data === "string" && data.endsWith("-00001") && !["QUO", "SO", "INV"].includes(prefix))) {
    return genNumber(fallbackPrefix);
  }
  return data as string;
}

// ---------- Quotations ----------
export function useQuotations() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["sales", "quotations", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select("*, customer:customers(id,name), items:quotation_items(*)")
        .eq("company_id", profile!.company_id!)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface QuotationInput {
  id?: string;
  customer_id: string;
  issue_date: string;
  valid_until?: string | null;
  status: QuotationStatus;
  tax_type: TaxType;
  notes?: string | null;
  lines: DocLine[];
}

export function useSaveQuotation() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuotationInput) => {
      const companyId = profile!.company_id!;
      const totals = computeTotals(input.lines, input.tax_type);
      const header = {
        company_id: companyId,
        customer_id: input.customer_id,
        issue_date: input.issue_date,
        valid_until: input.valid_until ?? null,
        status: input.status,
        tax_type: input.tax_type,
        notes: input.notes ?? null,
        subtotal: totals.subtotal,
        discount_total: totals.discount_total,
        tax_total: totals.tax_total,
        grand_total: totals.grand_total,
      };
      let quotationId = input.id;
      if (quotationId) {
        const { error } = await supabase.from("quotations").update(header).eq("id", quotationId);
        if (error) throw error;
        await supabase.from("quotation_items").delete().eq("quotation_id", quotationId);
      } else {
        const quotation_number = await nextDocNumber(companyId, "QUO", "QUO");
        const { data, error } = await supabase
          .from("quotations")
          .insert({ ...header, quotation_number, created_by: profile!.id })
          .select("id")
          .single();
        if (error) throw error;
        quotationId = data.id;
      }
      const rows = input.lines.map((l, i) => {
        const c = computeLine(l, input.tax_type);
        return {
          quotation_id: quotationId!,
          company_id: companyId,
          product_name: l.product_name,
          description: l.description ?? null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_percent: l.discount_percent,
          tax_percent: l.tax_percent,
          line_total: c.line_total,
          position: i,
        };
      });
      if (rows.length) {
        const { error } = await supabase.from("quotation_items").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "quotations"] });
      toast.success("Quotation saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Sales Orders ----------
export function useSalesOrders() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["sales", "sales_orders", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select("*, customer:customers(id,name), items:sales_order_items(*)")
        .eq("company_id", profile!.company_id!)
        .order("order_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface SalesOrderInput {
  id?: string;
  customer_id: string;
  order_date: string;
  delivery_date?: string | null;
  status: SalesOrderStatus;
  tax_type: TaxType;
  notes?: string | null;
  lines: DocLine[];
}

export function useSaveSalesOrder() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SalesOrderInput) => {
      const companyId = profile!.company_id!;
      const totals = computeTotals(input.lines, input.tax_type);
      const header = {
        company_id: companyId,
        customer_id: input.customer_id,
        order_date: input.order_date,
        delivery_date: input.delivery_date ?? null,
        status: input.status,
        tax_type: input.tax_type,
        notes: input.notes ?? null,
        subtotal: totals.subtotal,
        discount_total: totals.discount_total,
        tax_total: totals.tax_total,
        grand_total: totals.grand_total,
      };
      let id = input.id;
      if (id) {
        const { error } = await supabase.from("sales_orders").update(header).eq("id", id);
        if (error) throw error;
        await supabase.from("sales_order_items").delete().eq("sales_order_id", id);
      } else {
        const order_number = await nextDocNumber(companyId, "SO", "SO");
        const { data, error } = await supabase
          .from("sales_orders")
          .insert({ ...header, order_number, created_by: profile!.id })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }
      const rows = input.lines.map((l, i) => {
        const c = computeLine(l, input.tax_type);
        return {
          sales_order_id: id!,
          company_id: companyId,
          product_name: l.product_name,
          description: l.description ?? null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_percent: l.discount_percent,
          tax_percent: l.tax_percent,
          line_total: c.line_total,
          position: i,
        };
      });
      if (rows.length) {
        const { error } = await supabase.from("sales_order_items").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "sales_orders"] });
      toast.success("Sales order saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Invoices ----------
export function useInvoices() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["sales", "invoices", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, customer:customers(id,name), items:invoice_items(*)")
        .eq("company_id", profile!.company_id!)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface InvoiceInput {
  id?: string;
  customer_id: string;
  invoice_date: string;
  due_date?: string | null;
  status: InvoiceStatus;
  tax_type: TaxType;
  notes?: string | null;
  lines: DocLine[];
}

export function useSaveInvoice() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvoiceInput) => {
      const companyId = profile!.company_id!;
      const totals = computeTotals(input.lines, input.tax_type);
      const header = {
        company_id: companyId,
        customer_id: input.customer_id,
        invoice_date: input.invoice_date,
        due_date: input.due_date ?? null,
        status: input.status,
        tax_type: input.tax_type,
        notes: input.notes ?? null,
        subtotal: totals.subtotal,
        discount_total: totals.discount_total,
        cgst_total: totals.cgst_total,
        sgst_total: totals.sgst_total,
        igst_total: totals.igst_total,
        tax_total: totals.tax_total,
        grand_total: totals.grand_total,
        amount_due: totals.grand_total,
      };
      let id = input.id;
      if (id) {
        const { error } = await supabase.from("invoices").update(header).eq("id", id);
        if (error) throw error;
        await supabase.from("invoice_items").delete().eq("invoice_id", id);
      } else {
        const invoice_number = await nextDocNumber(companyId, "INV", "INV");
        const { data, error } = await supabase
          .from("invoices")
          .insert({ ...header, invoice_number, created_by: profile!.id })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }
      const rows = input.lines.map((l, i) => {
        const c = computeLine(l, input.tax_type);
        return {
          invoice_id: id!,
          company_id: companyId,
          product_name: l.product_name,
          description: l.description ?? null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_percent: l.discount_percent,
          tax_percent: l.tax_percent,
          cgst_amount: c.cgst_amount,
          sgst_amount: c.sgst_amount,
          igst_amount: c.igst_amount,
          line_total: c.line_total,
          position: i,
        };
      });
      if (rows.length) {
        const { error } = await supabase.from("invoice_items").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "invoices"] });
      toast.success("Invoice saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Delivery Notes ----------
export function useDeliveryNotes() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["sales", "delivery_notes", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_notes")
        .select("*, customer:customers(id,name), items:delivery_note_items(*, item:items(id,name,sku))")
        .eq("company_id", profile!.company_id!)
        .order("delivery_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface DeliveryLine {
  item_id: string;
  qty: number;
  uom?: string;
  notes?: string;
}

export interface DeliveryInput {
  id?: string;
  customer_id: string;
  delivery_date: string;
  status: DeliveryStatus;
  vehicle_no?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  notes?: string | null;
  lines: DeliveryLine[];
}

export function useSaveDeliveryNote() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeliveryInput) => {
      const companyId = profile!.company_id!;
      const header = {
        company_id: companyId,
        customer_id: input.customer_id,
        delivery_date: input.delivery_date,
        status: input.status,
        vehicle_no: input.vehicle_no ?? null,
        driver_name: input.driver_name ?? null,
        driver_phone: input.driver_phone ?? null,
        notes: input.notes ?? null,
      };
      let id = input.id;
      if (id) {
        const { error } = await supabase.from("delivery_notes").update(header).eq("id", id);
        if (error) throw error;
        await supabase.from("delivery_note_items").delete().eq("dn_id", id);
      } else {
        const dn_no = await nextDocNumber(companyId, "DN", "DN");
        const { data, error } = await supabase
          .from("delivery_notes")
          .insert({ ...header, dn_no, created_by: profile!.id })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }
      const rows = input.lines
        .filter((l) => l.item_id && l.qty > 0)
        .map((l) => ({
          dn_id: id!,
          item_id: l.item_id,
          qty: l.qty,
          uom: l.uom ?? null,
          notes: l.notes ?? null,
        }));
      if (rows.length) {
        const { error } = await supabase.from("delivery_note_items").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "delivery_notes"] });
      toast.success("Delivery note saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Sales Returns ----------
export function useSalesReturns() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["sales", "returns", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_returns")
        .select("*, customer:customers(id,name), invoice:invoices(id,invoice_number), items:sales_return_items(*, item:items(id,name,sku))")
        .eq("company_id", profile!.company_id!)
        .order("return_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface ReturnLine {
  item_id: string;
  qty: number;
  uom?: string;
  rate: number;
  tax_pct: number;
}

export interface ReturnInput {
  id?: string;
  customer_id: string;
  invoice_id?: string | null;
  return_date: string;
  status: ReturnStatus;
  reason?: string | null;
  notes?: string | null;
  lines: ReturnLine[];
}

export function useSaveSalesReturn() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReturnInput) => {
      const companyId = profile!.company_id!;
      const subtotal = input.lines.reduce((s, l) => s + l.qty * l.rate, 0);
      const tax_amount = input.lines.reduce((s, l) => s + l.qty * l.rate * (l.tax_pct / 100), 0);
      const total = subtotal + tax_amount;
      const header = {
        company_id: companyId,
        customer_id: input.customer_id,
        invoice_id: input.invoice_id ?? null,
        return_date: input.return_date,
        status: input.status,
        reason: input.reason ?? null,
        notes: input.notes ?? null,
        subtotal,
        tax_amount,
        total,
      };
      let id = input.id;
      if (id) {
        const { error } = await supabase.from("sales_returns").update(header).eq("id", id);
        if (error) throw error;
        await supabase.from("sales_return_items").delete().eq("return_id", id);
      } else {
        const return_no = await nextDocNumber(companyId, "SR", "SR");
        const { data, error } = await supabase
          .from("sales_returns")
          .insert({ ...header, return_no, created_by: profile!.id })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }
      const rows = input.lines
        .filter((l) => l.item_id && l.qty > 0)
        .map((l) => {
          const lineNet = l.qty * l.rate;
          const lineTax = lineNet * (l.tax_pct / 100);
          return {
            return_id: id!,
            item_id: l.item_id,
            qty: l.qty,
            uom: l.uom ?? null,
            rate: l.rate,
            tax_pct: l.tax_pct,
            tax_amount: lineTax,
            line_total: lineNet + lineTax,
          };
        });
      if (rows.length) {
        const { error } = await supabase.from("sales_return_items").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "returns"] });
      toast.success("Return saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Payments ----------
export function usePayments() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["sales", "payments", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, invoice:invoices(id,invoice_number,customer:customers(id,name))")
        .eq("company_id", profile!.company_id!)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface PaymentInput {
  id?: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

export function useSavePayment() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentInput) => {
      const companyId = profile!.company_id!;
      const row = {
        company_id: companyId,
        invoice_id: input.invoice_id,
        payment_date: input.payment_date,
        amount: input.amount,
        method: input.method,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
      };
      if (input.id) {
        const { error } = await supabase.from("payments").update(row).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payments").insert({ ...row, created_by: profile!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "payments"] });
      qc.invalidateQueries({ queryKey: ["sales", "invoices"] });
      toast.success("Payment saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Delete mutations ----------
function useDelete(table: "quotations" | "sales_orders" | "invoices" | "delivery_notes" | "sales_returns" | "payments", key: string, label: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", key] });
      if (table === "payments") qc.invalidateQueries({ queryKey: ["sales", "invoices"] });
      toast.success(`${label} deleted`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });
}

export const useDeleteQuotation = () => useDelete("quotations", "quotations", "Quotation");
export const useDeleteSalesOrder = () => useDelete("sales_orders", "sales_orders", "Sales order");
export const useDeleteInvoice = () => useDelete("invoices", "invoices", "Invoice");
export const useDeleteDeliveryNote = () => useDelete("delivery_notes", "delivery_notes", "Delivery note");
export const useDeleteSalesReturn = () => useDelete("sales_returns", "returns", "Return");
export const useDeletePayment = () => useDelete("payments", "payments", "Payment");

// ---------- Cross-doc conversions (O2C flow) ----------
async function eventAndLink(companyId: string, src: { kind: any; id: string }, dst: { kind: any; id: string }, event: string, payload: Record<string, unknown> = {}) {
  try {
    await supabase.rpc("link_documents", { _company_id: companyId, _src_kind: src.kind, _src_id: src.id, _dst_kind: dst.kind, _dst_id: dst.id });
    await supabase.rpc("record_document_event", { _company_id: companyId, _kind: src.kind, _id: src.id, _event: event, _payload: payload as never });
    await supabase.rpc("record_document_event", { _company_id: companyId, _kind: dst.kind, _id: dst.id, _event: "created_from_" + src.kind, _payload: { source_id: src.id } as never });
  } catch (e) { /* soft-fail: linking is auxiliary */ }
}

export function useConvertSoToInvoice() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (soId: string) => {
      const companyId = profile!.company_id!;
      const { data: so, error: soErr } = await supabase
        .from("sales_orders")
        .select("*, items:sales_order_items(*)")
        .eq("id", soId).single();
      if (soErr || !so) throw soErr ?? new Error("SO not found");
      const lines = (so.items ?? []).map((i: any) => ({
        product_name: i.product_name, description: i.description ?? null,
        quantity: Number(i.quantity), unit_price: Number(i.unit_price),
        discount_percent: Number(i.discount_percent ?? 0), tax_percent: Number(i.tax_percent ?? 0),
      }));
      const totals = computeTotals(lines, so.tax_type as TaxType);
      const invoice_number = await nextDocNumber(companyId, "INV", "INV");
      const today = new Date().toISOString().slice(0, 10);
      const { data: inv, error } = await supabase.from("invoices").insert({
        company_id: companyId, customer_id: so.customer_id,
        invoice_number, invoice_date: today,
        status: "sent" as InvoiceStatus, tax_type: so.tax_type,
        subtotal: totals.subtotal, discount_total: totals.discount_total,
        cgst_total: totals.cgst_total, sgst_total: totals.sgst_total, igst_total: totals.igst_total,
        tax_total: totals.tax_total, grand_total: totals.grand_total, amount_due: totals.grand_total,
        sales_order_id: soId,
        source_doc_kind: "sales_order", source_doc_id: soId,
        created_by: profile!.id,
      }).select("id").single();
      if (error) throw error;
      const rows = lines.map((l, i) => {
        const c = computeLine(l, so.tax_type as TaxType);
        return {
          invoice_id: inv.id, company_id: companyId,
          product_name: l.product_name, description: l.description,
          quantity: l.quantity, unit_price: l.unit_price,
          discount_percent: l.discount_percent, tax_percent: l.tax_percent,
          cgst_amount: c.cgst_amount, sgst_amount: c.sgst_amount, igst_amount: c.igst_amount,
          line_total: c.line_total, position: i,
        };
      });
      if (rows.length) await supabase.from("invoice_items").insert(rows);
      await supabase.from("sales_orders").update({ status: "fulfilled" as SalesOrderStatus }).eq("id", soId);
      await eventAndLink(companyId, { kind: "sales_order", id: soId }, { kind: "invoice", id: inv.id }, "invoiced");
      return inv.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "invoices"] });
      qc.invalidateQueries({ queryKey: ["sales", "sales_orders"] });
      toast.success("Invoice created from sales order");
    },
    onError: (e: any) => toast.error(e?.message ?? "Convert failed"),
  });
}

export function useConvertSoToDeliveryNote() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (soId: string) => {
      const companyId = profile!.company_id!;
      const { data: so, error: soErr } = await supabase
        .from("sales_orders")
        .select("*, items:sales_order_items(*)")
        .eq("id", soId).single();
      if (soErr || !so) throw soErr ?? new Error("SO not found");
      const { data: items = [] } = await supabase
        .from("items").select("id,name,sku,unit").eq("company_id", companyId);
      const findItem = (name: string) => items.find((it: any) =>
        it.name?.toLowerCase() === name.toLowerCase() || it.sku?.toLowerCase() === name.toLowerCase());
      const dnLines = (so.items ?? [])
        .map((i: any) => { const m = findItem(i.product_name); return m ? { item_id: m.id, qty: Number(i.quantity), uom: m.unit ?? null } : null; })
        .filter(Boolean) as any[];
      if (!dnLines.length) throw new Error("No SO lines matched an item in master. Create items first.");
      const dn_no = await nextDocNumber(companyId, "DN", "DN");
      const today = new Date().toISOString().slice(0, 10);
      const { data: dn, error } = await supabase.from("delivery_notes").insert({
        company_id: companyId, customer_id: so.customer_id,
        dn_no, delivery_date: today, status: "dispatched" as DeliveryStatus,
        sales_order_id: soId,
        source_doc_kind: "sales_order", source_doc_id: soId,
        created_by: profile!.id,
      }).select("id").single();
      if (error) throw error;
      await supabase.from("delivery_note_items").insert(dnLines.map((l) => ({ ...l, dn_id: dn.id })));
      await eventAndLink(companyId, { kind: "sales_order", id: soId }, { kind: "delivery_note", id: dn.id }, "delivered");
      return dn.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "delivery_notes"] });
      qc.invalidateQueries({ queryKey: ["sales", "sales_orders"] });
      toast.success("Delivery note created from sales order");
    },
    onError: (e: any) => toast.error(e?.message ?? "Convert failed"),
  });
}

export function useConvertQuotationToSalesOrder() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (qId: string) => {
      const companyId = profile!.company_id!;
      const { data: q, error: qErr } = await supabase
        .from("quotations")
        .select("*, items:quotation_items(*)")
        .eq("id", qId).single();
      if (qErr || !q) throw qErr ?? new Error("Quotation not found");
      const lines = (q.items ?? []).map((i: any) => ({
        product_name: i.product_name, description: i.description ?? null,
        quantity: Number(i.quantity), unit_price: Number(i.unit_price),
        discount_percent: Number(i.discount_percent ?? 0), tax_percent: Number(i.tax_percent ?? 0),
      }));
      const totals = computeTotals(lines, q.tax_type as TaxType);
      const order_number = await nextDocNumber(companyId, "SO", "SO");
      const today = new Date().toISOString().slice(0, 10);
      const { data: so, error } = await supabase.from("sales_orders").insert({
        company_id: companyId, customer_id: q.customer_id,
        order_number, order_date: today,
        status: "approved" as SalesOrderStatus, tax_type: q.tax_type,
        subtotal: totals.subtotal, discount_total: totals.discount_total,
        tax_total: totals.tax_total, grand_total: totals.grand_total,
        source_doc_kind: "quotation", source_doc_id: qId,
        created_by: profile!.id,
      }).select("id").single();
      if (error) throw error;
      const rows = lines.map((l, i) => {
        const c = computeLine(l, q.tax_type as TaxType);
        return { sales_order_id: so.id, company_id: companyId,
          product_name: l.product_name, description: l.description,
          quantity: l.quantity, unit_price: l.unit_price,
          discount_percent: l.discount_percent, tax_percent: l.tax_percent,
          line_total: c.line_total, position: i };
      });
      if (rows.length) await supabase.from("sales_order_items").insert(rows);
      await supabase.from("quotations").update({ status: "accepted" as QuotationStatus }).eq("id", qId);
      await eventAndLink(companyId, { kind: "quotation", id: qId }, { kind: "sales_order", id: so.id }, "accepted");
      return so.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "sales_orders"] });
      qc.invalidateQueries({ queryKey: ["sales", "quotations"] });
      toast.success("Sales order created from quotation");
    },
    onError: (e: any) => toast.error(e?.message ?? "Convert failed"),
  });
}