import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { computeLine, computeTotals, type TaxType } from "@/lib/sales-utils";

// ---------- masters ----------
export function useSuppliers() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["procurement", "suppliers", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name, code, gst_number, address, payment_terms")
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
    queryKey: ["procurement", "items", profile?.company_id],
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

export function useWarehouses() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["procurement", "warehouses", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, code")
        .eq("company_id", profile!.company_id!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function gen(prefix: string) {
  const yy = new Date().getFullYear().toString().slice(-2);
  const rnd = Math.floor(Math.random() * 90000 + 10000);
  return `${prefix}-${yy}-${rnd}`;
}
async function nextNumber(companyId: string, prefix: string) {
  const { data, error } = await supabase.rpc("next_proc_number", { _company_id: companyId, _prefix: prefix });
  if (error || !data) return gen(prefix);
  return data as string;
}

// ---------- Purchase Indents (Purchase Requests) ----------
export interface IndentLine { item_name: string; item_code?: string; unit?: string; quantity: number; notes?: string }
export interface IndentInput {
  id?: string;
  indent_number?: string;
  status: string;
  required_by?: string | null;
  source?: string | null;
  notes?: string | null;
  lines: IndentLine[];
}

export function useIndents() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["procurement", "indents", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_indents")
        .select("*, items:purchase_indent_items(*)")
        .eq("company_id", profile!.company_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveIndent() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: IndentInput) => {
      const companyId = profile!.company_id!;
      const header = {
        company_id: companyId,
        status: input.status as any,
        required_by: input.required_by ?? null,
        source: input.source ?? null,
        notes: input.notes ?? null,
      };
      let id = input.id;
      if (id) {
        const { error } = await supabase.from("purchase_indents").update(header as any).eq("id", id);
        if (error) throw error;
        await supabase.from("purchase_indent_items").delete().eq("indent_id", id);
      } else {
        const indent_number = await nextNumber(companyId, "INDENT");
        const { data, error } = await supabase.from("purchase_indents")
          .insert({ ...header, indent_number, created_by: profile!.id } as any)
          .select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const rows = input.lines.filter(l => l.item_name.trim() && l.quantity > 0).map((l, i) => ({
        company_id: companyId, indent_id: id!, item_name: l.item_name, item_code: l.item_code ?? null,
        unit: l.unit || "Nos", quantity: l.quantity, notes: l.notes ?? null, position: i,
      }));
      if (rows.length) {
        const { error } = await supabase.from("purchase_indent_items").insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procurement", "indents"] }); toast.success("Purchase request saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- RFQs ----------
export interface RFQLine { item_name: string; item_code?: string; unit?: string; quantity: number }
export interface RFQInput { id?: string; status: string; issue_date: string; due_date?: string | null; indent_id?: string | null; notes?: string | null; lines: RFQLine[] }

export function useRFQs() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["procurement", "rfqs", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfqs")
        .select("*, items:rfq_items(*)")
        .eq("company_id", profile!.company_id!)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveRFQ() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RFQInput) => {
      const companyId = profile!.company_id!;
      const header = {
        company_id: companyId, status: input.status as any, issue_date: input.issue_date,
        due_date: input.due_date ?? null, indent_id: input.indent_id ?? null, notes: input.notes ?? null,
      };
      let id = input.id;
      if (id) {
        const { error } = await supabase.from("rfqs").update(header as any).eq("id", id);
        if (error) throw error;
        await supabase.from("rfq_items").delete().eq("rfq_id", id);
      } else {
        const rfq_number = await nextNumber(companyId, "RFQ");
        const { data, error } = await supabase.from("rfqs").insert({ ...header, rfq_number, created_by: profile!.id } as any).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const rows = input.lines.filter(l => l.item_name.trim() && l.quantity > 0).map((l, i) => ({
        company_id: companyId, rfq_id: id!, item_name: l.item_name, item_code: l.item_code ?? null, unit: l.unit || "Nos", quantity: l.quantity, position: i,
      }));
      if (rows.length) {
        const { error } = await supabase.from("rfq_items").insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procurement", "rfqs"] }); toast.success("RFQ saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Vendor Quotations (rfq_supplier_quotes) ----------
export interface VendorQuoteInput {
  id?: string;
  rfq_id: string;
  rfq_item_id: string;
  supplier_id: string;
  unit_price: number;
  lead_time_days?: number | null;
  notes?: string | null;
  is_selected?: boolean;
}

export function useVendorQuotes() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["procurement", "vendor_quotes", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfq_supplier_quotes")
        .select("*, supplier:suppliers(id,name,code), rfq:rfqs(id,rfq_number), rfq_item:rfq_items(id,item_name,quantity,unit)")
        .eq("company_id", profile!.company_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveVendorQuote() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VendorQuoteInput) => {
      const companyId = profile!.company_id!;
      const row = {
        company_id: companyId,
        rfq_id: input.rfq_id,
        rfq_item_id: input.rfq_item_id,
        supplier_id: input.supplier_id,
        unit_price: input.unit_price,
        lead_time_days: input.lead_time_days ?? null,
        notes: input.notes ?? null,
        is_selected: input.is_selected ?? false,
      };
      if (input.id) {
        const { error } = await supabase.from("rfq_supplier_quotes").update(row as any).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rfq_supplier_quotes").insert(row as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procurement", "vendor_quotes"] }); toast.success("Vendor quote saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Purchase Orders ----------
export interface POLine { item_name: string; item_code?: string; unit?: string; quantity: number; unit_price: number; tax_percent: number }
export interface POInput {
  id?: string; supplier_id: string; order_date: string; expected_date?: string | null;
  status: string; freight?: number; notes?: string | null; lines: POLine[]; tax_type: TaxType;
  rfq_id?: string | null; indent_id?: string | null;
}

export function usePurchaseOrders() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["procurement", "purchase_orders", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, supplier:suppliers(id,name,code), items:purchase_order_items(*)")
        .eq("company_id", profile!.company_id!)
        .order("order_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSavePurchaseOrder() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: POInput) => {
      const companyId = profile!.company_id!;
      const totals = computeTotals(
        input.lines.map(l => ({ quantity: l.quantity, unit_price: l.unit_price, discount_percent: 0, tax_percent: l.tax_percent })),
        input.tax_type,
      );
      const header = {
        company_id: companyId, supplier_id: input.supplier_id,
        order_date: input.order_date, expected_date: input.expected_date ?? null,
        status: input.status as any, freight: input.freight ?? 0, notes: input.notes ?? null,
        rfq_id: input.rfq_id ?? null, indent_id: input.indent_id ?? null,
        subtotal: totals.subtotal, tax_total: totals.tax_total,
        grand_total: totals.grand_total + (input.freight ?? 0),
      };
      let id = input.id;
      if (id) {
        const { error } = await supabase.from("purchase_orders").update(header as any).eq("id", id);
        if (error) throw error;
        await supabase.from("purchase_order_items").delete().eq("po_id", id);
      } else {
        const po_number = await nextNumber(companyId, "PO");
        const { data, error } = await supabase.from("purchase_orders").insert({ ...header, po_number, created_by: profile!.id } as any).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const rows = input.lines.filter(l => l.item_name.trim() && l.quantity > 0).map((l, i) => {
        const c = computeLine({ quantity: l.quantity, unit_price: l.unit_price, discount_percent: 0, tax_percent: l.tax_percent }, input.tax_type);
        return {
          company_id: companyId, po_id: id!, item_name: l.item_name, item_code: l.item_code ?? null,
          unit: l.unit || "Nos", quantity: l.quantity, unit_price: l.unit_price, tax_percent: l.tax_percent,
          line_total: c.line_total, position: i,
        };
      });
      if (rows.length) {
        const { error } = await supabase.from("purchase_order_items").insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procurement", "purchase_orders"] }); toast.success("Purchase order saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- GRNs ----------
export interface GRNLine { item_id?: string | null; item_name: string; unit?: string; quantity: number; unit_cost: number; batch_no?: string | null }
export interface GRNInput {
  id?: string; po_id?: string | null; supplier_id?: string | null; warehouse_id?: string | null;
  received_date: string; status: string; freight?: number; duty?: number; other_landed?: number; notes?: string | null;
  lines: GRNLine[];
}

export function useGRNs() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["procurement", "grns", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grns")
        .select("*, supplier:suppliers(id,name,code), po:purchase_orders(id,po_number), items:grn_items(*)")
        .eq("company_id", profile!.company_id!)
        .order("received_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveGRN() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GRNInput) => {
      const companyId = profile!.company_id!;
      const header = {
        company_id: companyId, po_id: input.po_id ?? null, supplier_id: input.supplier_id ?? null,
        warehouse_id: input.warehouse_id ?? null, received_date: input.received_date,
        status: input.status as any, freight: input.freight ?? 0, duty: input.duty ?? 0,
        other_landed: input.other_landed ?? 0, notes: input.notes ?? null,
      };
      let id = input.id;
      if (id) {
        const { error } = await supabase.from("grns").update(header as any).eq("id", id);
        if (error) throw error;
        await supabase.from("grn_items").delete().eq("grn_id", id);
      } else {
        const grn_number = await nextNumber(companyId, "GRN");
        const { data, error } = await supabase.from("grns").insert({ ...header, grn_number, created_by: profile!.id } as any).select("id").single() as any;
        if (error) throw error;
        id = data.id;
      }
      const rows = input.lines.filter(l => l.item_name.trim() && l.quantity > 0).map((l, i) => ({
        company_id: companyId, grn_id: id!, item_id: l.item_id ?? null, item_name: l.item_name,
        unit: l.unit || "Nos", quantity: l.quantity, unit_cost: l.unit_cost,
        warehouse_id: input.warehouse_id ?? null, batch_no: l.batch_no ?? null, position: i,
      }));
      if (rows.length) {
        const { error } = await supabase.from("grn_items").insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procurement", "grns"] }); toast.success("Goods receipt saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Vendor Invoices ----------
export interface VInvLine { item_name: string; unit?: string; quantity: number; unit_price: number; tax_percent: number }
export interface VInvInput {
  id?: string; supplier_id: string; po_id?: string | null; grn_id?: string | null;
  invoice_date: string; due_date?: string | null; status: string; tax_type: TaxType;
  supplier_invoice_no?: string | null; notes?: string | null; lines: VInvLine[];
}

export function useVendorInvoices() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["procurement", "vendor_invoices", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_invoices")
        .select("*, supplier:suppliers(id,name,code), items:vendor_invoice_items(*)")
        .eq("company_id", profile!.company_id!)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveVendorInvoice() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VInvInput) => {
      const companyId = profile!.company_id!;
      const totals = computeTotals(
        input.lines.map(l => ({ quantity: l.quantity, unit_price: l.unit_price, discount_percent: 0, tax_percent: l.tax_percent })),
        input.tax_type,
      );
      const header = {
        company_id: companyId, supplier_id: input.supplier_id, po_id: input.po_id ?? null,
        grn_id: input.grn_id ?? null, invoice_date: input.invoice_date, due_date: input.due_date ?? null,
        status: input.status as any, supplier_invoice_no: input.supplier_invoice_no ?? null,
        notes: input.notes ?? null,
        subtotal: totals.subtotal, tax_total: totals.tax_total, grand_total: totals.grand_total,
        amount_due: totals.grand_total,
      };
      let id = input.id;
      if (id) {
        const { error } = await supabase.from("vendor_invoices").update(header as any).eq("id", id);
        if (error) throw error;
        await supabase.from("vendor_invoice_items").delete().eq("vinv_id", id);
      } else {
        const vinv_number = await nextNumber(companyId, "VINV");
        const { data, error } = await supabase.from("vendor_invoices").insert({ ...header, vinv_number, created_by: profile!.id } as any).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const rows = input.lines.filter(l => l.item_name.trim() && l.quantity > 0).map((l, i) => {
        const c = computeLine({ quantity: l.quantity, unit_price: l.unit_price, discount_percent: 0, tax_percent: l.tax_percent }, input.tax_type);
        return {
          company_id: companyId, vinv_id: id!, item_name: l.item_name, unit: l.unit || "Nos",
          quantity: l.quantity, unit_price: l.unit_price, tax_percent: l.tax_percent,
          line_total: c.line_total, position: i,
        };
      });
      if (rows.length) {
        const { error } = await supabase.from("vendor_invoice_items").insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procurement", "vendor_invoices"] }); toast.success("Vendor invoice saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Supplier Payments ----------
export interface VPayInput {
  id?: string; supplier_id: string; vinv_id?: string | null;
  payment_date: string; amount: number; method: string; reference?: string | null; notes?: string | null;
}

export function useVendorPayments() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["procurement", "vendor_payments", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_payments")
        .select("*, supplier:suppliers(id,name,code), vinv:vendor_invoices(id,vinv_number)")
        .eq("company_id", profile!.company_id!)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveVendorPayment() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VPayInput) => {
      const companyId = profile!.company_id!;
      const row = {
        company_id: companyId, supplier_id: input.supplier_id, vinv_id: input.vinv_id ?? null,
        payment_date: input.payment_date, amount: input.amount, method: input.method as any,
        reference: input.reference ?? null, notes: input.notes ?? null,
      };
      if (input.id) {
        const { error } = await supabase.from("supplier_payments").update(row as any).eq("id", input.id);
        if (error) throw error;
      } else {
        const payment_number = await nextNumber(companyId, "PAY");
        const { error } = await supabase.from("supplier_payments").insert({ ...row, payment_number, created_by: profile!.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procurement", "vendor_payments"] }); toast.success("Payment saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Vendor Returns ----------
export interface VRetLine { item_id?: string | null; description: string; unit?: string; quantity: number; rate: number; tax_rate: number }
export interface VRetInput {
  id?: string; supplier_id: string; grn_id?: string | null;
  return_date: string; status: string; reason?: string | null; notes?: string | null;
  lines: VRetLine[]; tax_type: TaxType;
}

export function useVendorReturns() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["procurement", "vendor_returns", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_returns" as any)
        .select("*, supplier:suppliers(id,name,code), grn:grns(id,grn_number), items:vendor_return_items(*)")
        .eq("company_id", profile!.company_id!)
        .order("return_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveVendorReturn() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VRetInput) => {
      const companyId = profile!.company_id!;
      const totals = computeTotals(
        input.lines.map(l => ({ quantity: l.quantity, unit_price: l.rate, discount_percent: 0, tax_percent: l.tax_rate })),
        input.tax_type,
      );
      const header = {
        company_id: companyId, supplier_id: input.supplier_id, grn_id: input.grn_id ?? null,
        return_date: input.return_date, status: input.status, reason: input.reason ?? null, notes: input.notes ?? null,
        subtotal: totals.subtotal, discount_total: totals.discount_total, tax_total: totals.tax_total,
        cgst_total: totals.cgst_total, sgst_total: totals.sgst_total, igst_total: totals.igst_total,
        grand_total: totals.grand_total,
      };
      let id = input.id;
      if (id) {
        const { error } = await supabase.from("vendor_returns" as any).update(header as any).eq("id", id);
        if (error) throw error;
        await supabase.from("vendor_return_items" as any).delete().eq("vret_id", id);
      } else {
        const vret_number = await nextNumber(companyId, "VRET");
        const { data, error } = await supabase.from("vendor_returns" as any).insert({ ...header, vret_number, created_by: profile!.id } as any).select("id").single() as any;
        if (error) throw error;
        id = data.id;
      }
      const rows = input.lines.filter(l => l.description.trim() && l.quantity > 0).map((l, i) => {
        const c = computeLine({ quantity: l.quantity, unit_price: l.rate, discount_percent: 0, tax_percent: l.tax_rate }, input.tax_type);
        return {
          company_id: companyId, vret_id: id!, item_id: l.item_id ?? null, description: l.description,
          unit: l.unit || "Nos", quantity: l.quantity, rate: l.rate, tax_rate: l.tax_rate,
          amount: c.line_total, position: i,
        };
      });
      if (rows.length) {
        const { error } = await supabase.from("vendor_return_items" as any).insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procurement", "vendor_returns"] }); toast.success("Vendor return saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Deletes ----------
function useDelete(table: string, key: string, label: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procurement", key] }); toast.success(`${label} deleted`); },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });
}
export const useDeleteIndent          = () => useDelete("purchase_indents",    "indents",          "Purchase request");
export const useDeleteRFQ             = () => useDelete("rfqs",                "rfqs",             "RFQ");
export const useDeleteVendorQuote     = () => useDelete("rfq_supplier_quotes", "vendor_quotes",    "Vendor quote");
export const useDeletePurchaseOrder   = () => useDelete("purchase_orders",     "purchase_orders",  "Purchase order");
export const useDeleteGRN             = () => useDelete("grns",                "grns",             "Goods receipt");
export const useDeleteVendorInvoice   = () => useDelete("vendor_invoices",     "vendor_invoices",  "Vendor invoice");
export const useDeleteVendorPayment   = () => useDelete("supplier_payments",   "vendor_payments",  "Payment");
export const useDeleteVendorReturn    = () => useDelete("vendor_returns",      "vendor_returns",   "Vendor return");

// ---------- Cross-doc conversions (P2P flow) ----------
async function eventAndLink(companyId: string, src: { kind: any; id: string }, dst: { kind: any; id: string }, event: string, payload: Record<string, unknown> = {}) {
  try {
    await supabase.rpc("link_documents", { _company_id: companyId, _src_kind: src.kind, _src_id: src.id, _dst_kind: dst.kind, _dst_id: dst.id });
    await supabase.rpc("record_document_event", { _company_id: companyId, _kind: src.kind, _id: src.id, _event: event, _payload: payload as never });
    await supabase.rpc("record_document_event", { _company_id: companyId, _kind: dst.kind, _id: dst.id, _event: "created_from_" + src.kind, _payload: { source_id: src.id } as never });
  } catch { /* soft-fail */ }
}

export function useConvertIndentToRFQ() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (indentId: string) => {
      const companyId = profile!.company_id!;
      const { data: ind, error } = await supabase.from("purchase_indents").select("*, items:purchase_indent_items(*)").eq("id", indentId).single();
      if (error || !ind) throw error ?? new Error("Indent not found");
      const rfq_number = await nextNumber(companyId, "RFQ");
      const today = new Date().toISOString().slice(0, 10);
      const { data: rfq, error: rErr } = await supabase.from("rfqs").insert({
        company_id: companyId, rfq_number, issue_date: today, status: "draft" as any,
        indent_id: indentId, source_doc_kind: "purchase_indent", source_doc_id: indentId,
        created_by: profile!.id,
      } as any).select("id").single();
      if (rErr) throw rErr;
      const rows = (ind.items ?? []).map((it: any, i: number) => ({
        company_id: companyId, rfq_id: rfq.id, item_name: it.item_name, item_code: it.item_code ?? null,
        unit: it.unit ?? "Nos", quantity: Number(it.quantity), position: i,
      }));
      if (rows.length) await supabase.from("rfq_items").insert(rows as any);
      await supabase.from("purchase_indents").update({ status: "converted" as any }).eq("id", indentId);
      await eventAndLink(companyId, { kind: "purchase_indent", id: indentId }, { kind: "rfq", id: rfq.id }, "converted_to_rfq");
      return rfq.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "indents"] });
      qc.invalidateQueries({ queryKey: ["procurement", "rfqs"] });
      toast.success("RFQ created from purchase request");
    },
    onError: (e: any) => toast.error(e?.message ?? "Convert failed"),
  });
}

export function useConvertRfqToPO() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rfqId: string) => {
      const companyId = profile!.company_id!;
      const { data: rfq, error } = await supabase.from("rfqs").select("*, items:rfq_items(*)").eq("id", rfqId).single();
      if (error || !rfq) throw error ?? new Error("RFQ not found");
      const { data: quotes } = await supabase.from("rfq_supplier_quotes").select("*").eq("rfq_id", rfqId);
      const selected = (quotes ?? []).find((q: any) => q.is_selected) ?? (quotes ?? [])[0];
      if (!selected) throw new Error("Add at least one vendor quote (mark one as selected) before creating a PO.");
      const priceByItem = new Map<string, number>();
      (quotes ?? []).filter((q: any) => q.supplier_id === selected.supplier_id).forEach((q: any) => priceByItem.set(q.rfq_item_id, Number(q.unit_price)));
      const lines = (rfq.items ?? []).map((it: any) => ({
        item_name: it.item_name, item_code: it.item_code ?? undefined, unit: it.unit ?? "Nos",
        quantity: Number(it.quantity), unit_price: priceByItem.get(it.id) ?? 0, tax_percent: 18,
      }));
      const totals = computeTotals(lines.map(l => ({ quantity: l.quantity, unit_price: l.unit_price, discount_percent: 0, tax_percent: l.tax_percent })), "intra_state");
      const po_number = await nextNumber(companyId, "PO");
      const today = new Date().toISOString().slice(0, 10);
      const { data: po, error: pErr } = await supabase.from("purchase_orders").insert({
        company_id: companyId, supplier_id: selected.supplier_id, po_number,
        order_date: today, status: "draft" as any, rfq_id: rfqId,
        subtotal: totals.subtotal, tax_total: totals.tax_total, grand_total: totals.grand_total,
        source_doc_kind: "rfq", source_doc_id: rfqId, created_by: profile!.id,
      } as any).select("id").single();
      if (pErr) throw pErr;
      const rows = lines.map((l, i) => {
        const c = computeLine({ quantity: l.quantity, unit_price: l.unit_price, discount_percent: 0, tax_percent: l.tax_percent }, "intra_state");
        return {
          company_id: companyId, po_id: po.id, item_name: l.item_name, item_code: l.item_code ?? null,
          unit: l.unit, quantity: l.quantity, unit_price: l.unit_price, tax_percent: l.tax_percent,
          line_total: c.line_total, position: i,
        };
      });
      if (rows.length) await supabase.from("purchase_order_items").insert(rows as any);
      await supabase.from("rfqs").update({ status: "closed" as any }).eq("id", rfqId);
      await eventAndLink(companyId, { kind: "rfq", id: rfqId }, { kind: "purchase_order", id: po.id }, "awarded", { supplier_id: selected.supplier_id });
      return po.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "purchase_orders"] });
      qc.invalidateQueries({ queryKey: ["procurement", "rfqs"] });
      toast.success("Purchase order created from RFQ");
    },
    onError: (e: any) => toast.error(e?.message ?? "Convert failed"),
  });
}

export function useConvertPoToGRN() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (poId: string) => {
      const companyId = profile!.company_id!;
      const { data: po, error } = await supabase.from("purchase_orders").select("*, items:purchase_order_items(*)").eq("id", poId).single();
      if (error || !po) throw error ?? new Error("PO not found");
      const { data: whs } = await supabase.from("warehouses").select("id").eq("company_id", companyId).limit(1);
      const warehouse_id = whs?.[0]?.id ?? null;
      const grn_number = await nextNumber(companyId, "GRN");
      const today = new Date().toISOString().slice(0, 10);
      const { data: grn, error: gErr } = await supabase.from("grns").insert({
        company_id: companyId, po_id: poId, supplier_id: po.supplier_id,
        warehouse_id, received_date: today, status: "draft" as any,
        grn_number, source_doc_kind: "purchase_order", source_doc_id: poId,
        created_by: profile!.id,
      } as any).select("id").single();
      if (gErr) throw gErr;
      const rows = (po.items ?? []).map((it: any, i: number) => ({
        company_id: companyId, grn_id: grn.id, po_item_id: it.id,
        item_name: it.item_name, unit: it.unit ?? "Nos",
        quantity: Number(it.quantity) - Number(it.received_quantity ?? 0),
        unit_cost: Number(it.unit_price), warehouse_id, position: i,
      })).filter((r: any) => r.quantity > 0);
      if (rows.length) await supabase.from("grn_items").insert(rows as any);
      await eventAndLink(companyId, { kind: "purchase_order", id: poId }, { kind: "grn", id: grn.id }, "received");
      return grn.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "grns"] });
      qc.invalidateQueries({ queryKey: ["procurement", "purchase_orders"] });
      toast.success("Draft GRN created from PO — post it to update inventory");
    },
    onError: (e: any) => toast.error(e?.message ?? "Convert failed"),
  });
}

export function useConvertGrnToVInvoice() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (grnId: string) => {
      const companyId = profile!.company_id!;
      const { data: grn, error } = await supabase.from("grns").select("*, items:grn_items(*)").eq("id", grnId).single();
      if (error || !grn) throw error ?? new Error("GRN not found");
      const lines = (grn.items ?? []).map((it: any) => ({
        item_name: it.item_name, unit: it.unit ?? "Nos",
        quantity: Number(it.quantity), unit_price: Number(it.unit_cost), tax_percent: 18,
      }));
      const totals = computeTotals(lines.map(l => ({ quantity: l.quantity, unit_price: l.unit_price, discount_percent: 0, tax_percent: l.tax_percent })), "intra_state");
      const vinv_number = await nextNumber(companyId, "VINV");
      const today = new Date().toISOString().slice(0, 10);
      const { data: v, error: vErr } = await supabase.from("vendor_invoices").insert({
        company_id: companyId, supplier_id: grn.supplier_id, po_id: grn.po_id, grn_id: grnId,
        vinv_number, invoice_date: today, status: "draft" as any,
        subtotal: totals.subtotal, tax_total: totals.tax_total, grand_total: totals.grand_total,
        amount_due: totals.grand_total,
        source_doc_kind: "grn", source_doc_id: grnId, created_by: profile!.id,
      } as any).select("id").single();
      if (vErr) throw vErr;
      const rows = lines.map((l, i) => {
        const c = computeLine({ quantity: l.quantity, unit_price: l.unit_price, discount_percent: 0, tax_percent: l.tax_percent }, "intra_state");
        return {
          company_id: companyId, vinv_id: v.id, item_name: l.item_name, unit: l.unit,
          quantity: l.quantity, unit_price: l.unit_price, tax_percent: l.tax_percent,
          line_total: c.line_total, position: i,
        };
      });
      if (rows.length) await supabase.from("vendor_invoice_items").insert(rows as any);
      await eventAndLink(companyId, { kind: "grn", id: grnId }, { kind: "vendor_invoice", id: v.id }, "invoiced");
      return v.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "vendor_invoices"] });
      qc.invalidateQueries({ queryKey: ["procurement", "grns"] });
      toast.success("Vendor invoice created from GRN");
    },
    onError: (e: any) => toast.error(e?.message ?? "Convert failed"),
  });
}

export function usePayVendorInvoice() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vinvId: string) => {
      const companyId = profile!.company_id!;
      const { data: v, error } = await supabase.from("vendor_invoices").select("*").eq("id", vinvId).single();
      if (error || !v) throw error ?? new Error("Vendor invoice not found");
      const due = Number(v.amount_due ?? v.grand_total ?? 0);
      if (due <= 0) throw new Error("Nothing due on this invoice");
      const payment_number = await nextNumber(companyId, "PAY");
      const today = new Date().toISOString().slice(0, 10);
      const { data: pay, error: pErr } = await supabase.from("supplier_payments").insert({
        company_id: companyId, supplier_id: v.supplier_id, vinv_id: vinvId,
        payment_number, payment_date: today, amount: due, method: "bank_transfer" as any,
        source_doc_kind: "vendor_invoice", source_doc_id: vinvId, created_by: profile!.id,
      } as any).select("id").single();
      if (pErr) throw pErr;
      await supabase.from("vendor_invoices").update({
        amount_paid: Number(v.amount_paid ?? 0) + due, amount_due: 0, status: "paid" as any,
      }).eq("id", vinvId);
      await eventAndLink(companyId, { kind: "vendor_invoice", id: vinvId }, { kind: "supplier_payment", id: pay.id }, "paid", { amount: due });
      return pay.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procurement", "vendor_payments"] });
      qc.invalidateQueries({ queryKey: ["procurement", "vendor_invoices"] });
      toast.success("Payment recorded against vendor invoice");
    },
    onError: (e: any) => toast.error(e?.message ?? "Payment failed"),
  });
}