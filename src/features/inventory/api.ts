import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import type { Database } from "@/integrations/supabase/types";

type ItemType = Database["public"]["Enums"]["item_type"];
type ValuationMethod = Database["public"]["Enums"]["valuation_method"];
type StockTxnType = Database["public"]["Enums"]["stock_txn_type"];

export interface ItemInput {
  id?: string;
  sku: string;
  name: string;
  description?: string | null;
  item_type: ItemType;
  unit: string;
  hsn_code?: string | null;
  min_stock?: number | null;
  reorder_level?: number | null;
  reorder_qty?: number | null;
  standard_cost?: number | null;
  valuation_method?: ValuationMethod;
  is_active?: boolean;
}

export interface WarehouseInput {
  id?: string;
  code: string;
  name: string;
  address?: string | null;
  is_active?: boolean;
}

// ---------- Items ----------
export function useItems() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["inv", "items", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("company_id", profile!.company_id!)
        .order("sku");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertItem() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  return useMutation({
    mutationFn: async (input: ItemInput) => {
      if (!profile?.company_id) throw new Error("No company");
      const payload: any = {
        ...input,
        company_id: profile.company_id,
        created_by: user?.id ?? null,
        is_active: input.is_active ?? true,
        valuation_method: input.valuation_method ?? "fifo" as ValuationMethod,
      };
      if (input.id) {
        const { error } = await supabase.from("items").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("items").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv", "items"] });
      toast.success("Item saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Warehouses ----------
export function useWarehouses() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["inv", "warehouses", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("company_id", profile!.company_id!)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertWarehouse() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: WarehouseInput) => {
      if (!profile?.company_id) throw new Error("No company");
      const payload: any = { ...input, company_id: profile.company_id, is_active: input.is_active ?? true };
      if (input.id) {
        const { error } = await supabase.from("warehouses").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("warehouses").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv", "warehouses"] });
      toast.success("Warehouse saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Stock Levels ----------
export function useStockLevels() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["inv", "stock-levels", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("item_stock_levels", {
        _company_id: profile!.company_id!,
      });
      if (error) throw error;
      return (data ?? []) as { item_id: string; warehouse_id: string; on_hand: number; value: number }[];
    },
  });
}

// ---------- Stock Transactions (Ledger) ----------
export function useLastMovementByItem() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["inv", "last-movement", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_transactions")
        .select("item_id, occurred_at")
        .eq("company_id", profile!.company_id!)
        .order("occurred_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      const m = new Map<string, string>();
      (data ?? []).forEach((r: any) => { if (!m.has(r.item_id)) m.set(r.item_id, r.occurred_at); });
      return m;
    },
  });
}

export interface StockTxnRow {
  id: string;
  occurred_at: string;
  txn_type: StockTxnType;
  quantity: number;
  unit_cost: number;
  total_value: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  warehouse_id: string;
  item_id: string;
  item: { name: string; sku: string } | null;
  warehouse: { name: string; code: string } | null;
}

export function useStockTransactions() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["inv", "txns", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_transactions")
        .select("*")
        .eq("company_id", profile!.company_id!)
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const itemIds = Array.from(new Set(rows.map((r) => r.item_id).filter(Boolean)));
      const whIds = Array.from(new Set(rows.map((r) => r.warehouse_id).filter(Boolean)));
      const [{ data: items }, { data: whs }] = await Promise.all([
        itemIds.length
          ? supabase.from("items").select("id, name, sku").in("id", itemIds)
          : Promise.resolve({ data: [] as any[] }),
        whIds.length
          ? supabase.from("warehouses").select("id, name, code").in("id", whIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const itemMap = new Map((items ?? []).map((i: any) => [i.id, { name: i.name, sku: i.sku }]));
      const whMap = new Map((whs ?? []).map((w: any) => [w.id, { name: w.name, code: w.code }]));
      return rows.map((r) => ({
        ...r,
        item: itemMap.get(r.item_id) ?? null,
        warehouse: whMap.get(r.warehouse_id) ?? null,
      })) as StockTxnRow[];
    },
  });
}

// ---------- Stock Adjustment (post via RPCs) ----------
export function usePostAdjustment() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      item_id: string;
      warehouse_id: string;
      variance: number; // + increases stock, - decreases
      reason: string;
      unit_cost?: number;
    }) => {
      if (!profile?.company_id) throw new Error("No company");
      if (input.variance === 0) throw new Error("Variance must be non-zero");
      if (input.variance > 0) {
        const { error } = await supabase.rpc("post_stock_receipt", {
          _company_id: profile.company_id,
          _item_id: input.item_id,
          _warehouse_id: input.warehouse_id,
          _quantity: input.variance,
          _unit_cost: input.unit_cost ?? 0,
          _batch_no: `ADJ-${Date.now()}`,
          _notes: `Adjustment: ${input.reason}`,
          _ref_type: "adjustment",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("post_stock_issue", {
          _company_id: profile.company_id,
          _item_id: input.item_id,
          _warehouse_id: input.warehouse_id,
          _quantity: Math.abs(input.variance),
          _notes: `Adjustment: ${input.reason}`,
          _ref_type: "adjustment",
          _txn_type: "adjustment" as StockTxnType,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv", "txns"] });
      qc.invalidateQueries({ queryKey: ["inv", "stock-levels"] });
      toast.success("Adjustment posted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Post failed"),
  });
}

// ---------- Stock Transfer (issue from source + receipt to destination) ----------
export function usePostTransfer() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      item_id: string;
      from_warehouse_id: string;
      to_warehouse_id: string;
      quantity: number;
      unit_cost?: number;
      notes?: string;
    }) => {
      if (!profile?.company_id) throw new Error("No company");
      if (input.from_warehouse_id === input.to_warehouse_id) throw new Error("Source and destination must differ");
      if (input.quantity <= 0) throw new Error("Quantity must be > 0");

      const { error: e1 } = await supabase.rpc("post_stock_issue", {
        _company_id: profile.company_id,
        _item_id: input.item_id,
        _warehouse_id: input.from_warehouse_id,
        _quantity: input.quantity,
        _notes: input.notes ?? "Stock transfer out",
        _ref_type: "transfer",
        _txn_type: "transfer_out" as StockTxnType,
      });
      if (e1) throw e1;

      const { error: e2 } = await supabase.rpc("post_stock_receipt", {
        _company_id: profile.company_id,
        _item_id: input.item_id,
        _warehouse_id: input.to_warehouse_id,
        _quantity: input.quantity,
        _unit_cost: input.unit_cost ?? 0,
        _batch_no: `TRF-${Date.now()}`,
        _notes: input.notes ?? "Stock transfer in",
        _ref_type: "transfer",
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv", "txns"] });
      qc.invalidateQueries({ queryKey: ["inv", "stock-levels"] });
      toast.success("Transfer posted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Transfer failed"),
  });
}

// ---------- Formatting helpers ----------
export const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
export const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0);
export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";