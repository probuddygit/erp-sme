import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type BinRow = Tables["inventory_bins"]["Row"];
export type CycleCountRow = Tables["cycle_counts"]["Row"];
export type CycleCountLineRow = Tables["cycle_count_lines"]["Row"];
export type BarcodeRow = Tables["item_barcodes"]["Row"];
export type SerialRow = Tables["item_serials"]["Row"];
export type BatchRow = Tables["stock_batches"]["Row"];

function useCompanyId() {
  const { profile, company } = useAuth() as any;
  return (company?.id ?? profile?.company_id ?? null) as string | null;
}

function ok(qc: ReturnType<typeof useQueryClient>, keys: string[][], msg: string) {
  keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  toast.success(msg);
}

/* ------------------------------- BINS -------------------------------- */
export function useBins() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["inv", "bins", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_bins").select("*").eq("company_id", companyId!).order("code");
      if (error) throw error;
      return (data ?? []) as BinRow[];
    },
  });
}

export interface BinInput {
  id?: string; warehouse_id: string; code: string; zone?: string | null; rack?: string | null;
  shelf?: string | null; capacity?: number; used?: number; is_active?: boolean; notes?: string | null;
}

export function useUpsertBin() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (input: BinInput) => {
      if (!companyId) throw new Error("No company selected");
      const { id, ...rest } = input;
      const payload = { ...rest, company_id: companyId };
      const { error } = id
        ? await supabase.from("inventory_bins").update(payload).eq("id", id)
        : await supabase.from("inventory_bins").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => ok(qc, [["inv", "bins"]], "Bin saved"),
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

/* --------------------------- CYCLE COUNTS ---------------------------- */
export function useCycleCounts() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["inv", "cycle-counts", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycle_counts").select("*").eq("company_id", companyId!)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      const counts = (data ?? []) as CycleCountRow[];
      const { data: lines } = await supabase
        .from("cycle_count_lines").select("*").eq("company_id", companyId!);
      const byCount = new Map<string, CycleCountLineRow[]>();
      (lines ?? []).forEach((l: any) => {
        const arr = byCount.get(l.count_id) ?? [];
        arr.push(l); byCount.set(l.count_id, arr);
      });
      return counts.map((c) => {
        const ls = byCount.get(c.id) ?? [];
        return {
          ...c,
          lines: ls,
          line_count: ls.length,
          variance: ls.reduce((s, l) => s + (Number(l.counted_qty) - Number(l.system_qty)), 0),
        };
      });
    },
  });
}
export type CycleCountWithLines = NonNullable<ReturnType<typeof useCycleCounts>["data"]>[number];

export interface CycleCountInput {
  id?: string;
  warehouse_id: string;
  count_number: string;
  zone?: string | null;
  scheduled_date: string;
  notes?: string | null;
  lines: { item_id: string; system_qty: number; counted_qty: number; unit_cost: number }[];
}

export function useUpsertCycleCount() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (input: CycleCountInput) => {
      if (!companyId) throw new Error("No company selected");
      const { id, lines, ...header } = input;
      let countId = id;
      if (id) {
        const { error } = await supabase.from("cycle_counts").update({ ...header, company_id: companyId }).eq("id", id);
        if (error) throw error;
        await supabase.from("cycle_count_lines").delete().eq("count_id", id);
      } else {
        const { data, error } = await supabase
          .from("cycle_counts").insert([{ ...header, company_id: companyId }]).select("id").single();
        if (error) throw error;
        countId = data.id;
      }
      if (lines.length) {
        const { error } = await supabase.from("cycle_count_lines").insert(
          lines.map((l) => ({ ...l, count_id: countId!, company_id: companyId })),
        );
        if (error) throw error;
      }
    },
    onSuccess: () => ok(qc, [["inv", "cycle-counts"]], "Cycle count saved"),
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

export function usePostCycleCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (countId: string) => {
      const { data, error } = await supabase.rpc("post_cycle_count", { _count_id: countId });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["inv"] });
      toast.success(`Cycle count posted — ${res?.posted_lines ?? 0} adjustment(s) created`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Posting failed"),
  });
}

/* ----------------------------- BARCODES ------------------------------ */
export function useBarcodes() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["inv", "barcodes", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_barcodes").select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BarcodeRow[];
    },
  });
}

export interface BarcodeInput { id?: string; item_id: string; barcode: string; format: string; }

export function useUpsertBarcode() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (input: BarcodeInput) => {
      if (!companyId) throw new Error("No company selected");
      const { id, ...rest } = input;
      const payload = { ...rest, company_id: companyId };
      const { error } = id
        ? await supabase.from("item_barcodes").update(payload).eq("id", id)
        : await supabase.from("item_barcodes").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => ok(qc, [["inv", "barcodes"]], "Barcode saved"),
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

/** Auto-generate a Code128 barcode for every item that does not have one yet. */
export function useGenerateBarcodes() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (args: { items: { id: string; sku: string }[]; existing: string[] }) => {
      if (!companyId) throw new Error("No company selected");
      const missing = args.items.filter((i) => !args.existing.includes(i.id));
      if (!missing.length) return 0;
      const rows = missing.map((i) => ({
        company_id: companyId,
        item_id: i.id,
        barcode: `${i.sku.replace(/[^A-Za-z0-9]/g, "").toUpperCase()}${String(Math.floor(Math.random() * 9000) + 1000)}`,
        format: "Code128",
      }));
      const { error } = await supabase.from("item_barcodes").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["inv", "barcodes"] });
      toast.success(n ? `${n} barcode(s) generated` : "All items already have barcodes");
    },
    onError: (e: any) => toast.error(e?.message ?? "Generation failed"),
  });
}

export function useMarkBarcodePrinted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: BarcodeRow) => {
      const { error } = await supabase.from("item_barcodes")
        .update({ printed_count: (row.printed_count ?? 0) + 1, last_printed_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inv", "barcodes"] }),
    onError: (e: any) => toast.error(e?.message ?? "Print failed"),
  });
}

/** Popup-blocker-safe label printing via hidden iframe. */
export function printLabel(html: string) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(`<html><head><title>Label</title><style>
    body{font-family:ui-sans-serif,system-ui;margin:24px;text-align:center}
    .code{font-family:'Libre Barcode 39',monospace;font-size:14px;letter-spacing:2px;margin-top:8px}
    .bars{display:flex;justify-content:center;gap:1px;height:56px;margin-top:12px}
    .bars i{display:block;background:#000;width:2px;height:100%}
    .bars i.w{width:4px}.bars i.s{background:#fff}
  </style></head><body>${html}</body></html>`);
  doc.close();
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  setTimeout(() => frame.remove(), 1500);
}

export function barcodeLabelHtml(title: string, subtitle: string, code: string) {
  const bars = code.split("").map((ch) => {
    const n = ch.charCodeAt(0) % 4;
    return `<i class="${n === 0 ? "w" : ""}"></i><i class="s ${n > 1 ? "w" : ""}"></i>`;
  }).join("");
  return `<div><div style="font-weight:600">${title}</div>
    <div style="font-size:12px;color:#666">${subtitle}</div>
    <div class="bars">${bars}</div>
    <div class="code">${code}</div></div>`;
}

/* ------------------------------ SERIALS ------------------------------ */
export function useSerials() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["inv", "serials", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_serials").select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SerialRow[];
    },
  });
}

export interface SerialInput {
  id?: string; item_id: string; warehouse_id?: string | null; serial_no: string; batch_no?: string | null;
  status: string; received_on?: string | null; warranty_end?: string | null; customer_id?: string | null;
}

export function useUpsertSerial() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (input: SerialInput) => {
      if (!companyId) throw new Error("No company selected");
      const { id, ...rest } = input;
      const payload = {
        ...rest,
        customer_id: rest.customer_id || null,
        warehouse_id: rest.warehouse_id || null,
        company_id: companyId,
      };
      const { error } = id
        ? await supabase.from("item_serials").update(payload).eq("id", id)
        : await supabase.from("item_serials").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => ok(qc, [["inv", "serials"]], "Serial saved"),
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

/* ------------------------------ BATCHES ------------------------------ */
export function useStockBatches() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["inv", "batches", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_batches").select("*").eq("company_id", companyId!)
        .order("received_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BatchRow[];
    },
  });
}

export function batchStatus(b: { expiry_date: string | null; qty_remaining: number }) {
  if (Number(b.qty_remaining) <= 0) return "consumed";
  if (!b.expiry_date) return "ok";
  const days = (new Date(b.expiry_date).getTime() - Date.now()) / 86400000;
  if (days < 0) return "expired";
  if (days < 45) return "expiring";
  return "ok";
}

export function ageDays(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

/* ------------------------- OPENING STOCK ----------------------------- */
export function useOpeningStock() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["inv", "opening", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_transactions").select("*")
        .eq("company_id", companyId!)
        .eq("reference_type", "opening")
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function usePostOpeningStock() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (input: { item_id: string; warehouse_id: string; quantity: number; unit_cost: number }) => {
      if (!companyId) throw new Error("No company selected");
      if (input.quantity <= 0) throw new Error("Quantity must be greater than zero");
      const { error } = await supabase.rpc("post_stock_receipt", {
        _company_id: companyId,
        _item_id: input.item_id,
        _warehouse_id: input.warehouse_id,
        _quantity: input.quantity,
        _unit_cost: input.unit_cost,
        _batch_no: `OPEN-${Date.now()}`,
        _ref_type: "opening",
        _notes: "Opening stock",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv"] });
      toast.success("Opening stock posted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Posting failed"),
  });
}

/* ------------------- AUTOMATION: reorder → indent -------------------- */
export function useCreateIndentFromReorder() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company selected");
      const { data, error } = await supabase.rpc("create_indent_from_reorder", { _company_id: companyId });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["procurement"] });
      if (res?.created) toast.success(`Purchase indent ${res.indent_number} created with ${res.lines} line(s)`);
      else toast.info("No items are below their reorder level");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not create indent"),
  });
}

/* ---------------------------- CUSTOMERS ------------------------------ */
export function useInvCustomers() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["inv", "customers", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers").select("id, name").eq("company_id", companyId!).order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

/* ----------------------------- LOOKUPS ------------------------------- */
export function useNameMaps(items: { id: string; name: string; sku: string; unit?: string }[], warehouses: { id: string; name: string; code: string }[]) {
  return useMemo(() => ({
    itemMap: new Map(items.map((i) => [i.id, i])),
    whMap: new Map(warehouses.map((w) => [w.id, w])),
  }), [items, warehouses]);
}

/* ------------------------------ EXPORT ------------------------------- */
export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) { toast.info("Nothing to export"); return; }
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success("Exported");
}
