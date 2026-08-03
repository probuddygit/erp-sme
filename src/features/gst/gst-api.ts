import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function useCompanyId() {
  const { company } = useAuth();
  return company?.id ?? null;
}

/* ------------------------------------------------------------------ */
/* Generic company_settings-backed JSON store                          */
/* ------------------------------------------------------------------ */
export function useGstSetting<T>(key: string, fallback: T) {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const queryKey = ["gst-setting", companyId, key];

  const query = useQuery({
    enabled: !!companyId,
    queryKey,
    queryFn: async (): Promise<T> => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("value")
        .eq("company_id", companyId!)
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value as T | undefined) ?? fallback;
    },
  });

  const save = useMutation({
    mutationFn: async (value: T) => {
      const { error } = await supabase
        .from("company_settings")
        .upsert(
          { company_id: companyId!, key, value: value as never },
          { onConflict: "company_id,key" },
        );
      if (error) throw error;
      return value;
    },
    onSuccess: (value) => {
      qc.setQueryData(queryKey, value);
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    value: query.data ?? fallback,
    isLoading: query.isLoading,
    save: save.mutateAsync,
    saving: save.isPending,
  };
}

/* ------------------------------------------------------------------ */
/* GST profile                                                         */
/* ------------------------------------------------------------------ */
export interface GstProfile {
  legalName: string;
  gstin: string;
  pan: string;
  stateCode: string;
  registrationType: "regular" | "composition" | "sez" | "casual";
  eInvoicing: boolean;
  autoEwayBill: boolean;
  ewbThreshold: number;
}
export const DEFAULT_GST_PROFILE: GstProfile = {
  legalName: "",
  gstin: "",
  pan: "",
  stateCode: "29",
  registrationType: "regular",
  eInvoicing: true,
  autoEwayBill: true,
  ewbThreshold: 50000,
};

export interface GspConfig {
  provider: "mock" | "nic" | "cygnet" | "cleartax" | "masters";
  baseUrl: string;
  clientId: string;
  username: string;
}
export const DEFAULT_GSP_CONFIG: GspConfig = { provider: "mock", baseUrl: "", clientId: "", username: "" };

export const useGstProfile = () => useGstSetting<GstProfile>("gst_profile", DEFAULT_GST_PROFILE);
export const useGspConfig = () => useGstSetting<GspConfig>("gst_gsp_config", DEFAULT_GSP_CONFIG);

/* ------------------------------------------------------------------ */
/* HSN master (settings-backed, importable from Item master)           */
/* ------------------------------------------------------------------ */
export interface HsnEntry {
  id: string;
  code: string;
  description: string;
  chapter: string;
  gstRate: number;
  type: "goods" | "service";
  uom: string;
}
export const useHsnCodes = () => useGstSetting<HsnEntry[]>("gst_hsn_codes", []);

export function useItemHsnSuggestions() {
  const companyId = useCompanyId();
  return useQuery({
    enabled: !!companyId,
    queryKey: ["gst-item-hsn", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("hsn_code, name, unit, item_type")
        .eq("company_id", companyId!)
        .not("hsn_code", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Tax rules (settings-backed)                                         */
/* ------------------------------------------------------------------ */
export interface TaxRuleEntry {
  id: string;
  name: string;
  scope: "sales" | "purchase" | "both";
  supplyType: "intra-state" | "inter-state" | "export" | "sez";
  hsnPattern: string;
  rateId: string;
  priority: number;
  active: boolean;
}
export const useTaxRules = () => useGstSetting<TaxRuleEntry[]>("gst_tax_rules", []);

/* ------------------------------------------------------------------ */
/* GST rates (live table)                                              */
/* ------------------------------------------------------------------ */
export interface GstRateRow {
  id: string;
  company_id: string;
  name: string;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  hsn_sac: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useGstRates() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const queryKey = ["gst-rates", companyId];

  const query = useQuery({
    enabled: !!companyId,
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gst_rates")
        .select("*")
        .eq("company_id", companyId!)
        .order("rate", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GstRateRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });

  const upsert = useMutation({
    mutationFn: async (row: Partial<GstRateRow> & { name: string; rate: number }) => {
      const payload = {
        ...row,
        company_id: companyId!,
      };
      const { error } = await supabase.from("gst_rates").upsert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("GST rate saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gst_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("GST rate deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    rates: query.data ?? [],
    isLoading: query.isLoading,
    save: upsert.mutateAsync,
    saving: upsert.isPending,
    remove: remove.mutateAsync,
  };
}

/* ------------------------------------------------------------------ */
/* GST ledger                                                          */
/* ------------------------------------------------------------------ */
export interface GstLedgerRow {
  id: string;
  txn_date: string;
  kind: "output" | "input";
  rate: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  source_module: string | null;
  source_id: string | null;
}

export function useGstLedger(from?: string, to?: string) {
  const companyId = useCompanyId();
  return useQuery({
    enabled: !!companyId,
    queryKey: ["gst-ledger", companyId, from, to],
    queryFn: async () => {
      let q = supabase
        .from("gst_ledger")
        .select("*")
        .eq("company_id", companyId!)
        .order("txn_date", { ascending: false });
      if (from) q = q.gte("txn_date", from);
      if (to) q = q.lte("txn_date", to);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as GstLedgerRow[];
    },
  });
}

/* ------------------------------------------------------------------ */
/* e-Invoices (live invoices)                                          */
/* ------------------------------------------------------------------ */
export interface EInvoiceLive {
  id: string;
  invoice_number: string;
  invoice_date: string;
  grand_total: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  subtotal: number;
  status: string;
  irn: string | null;
  einvoice_irn: string | null;
  qr_code_data: string | null;
  einvoice_payload: Record<string, unknown> | null;
  place_of_supply: string | null;
  customers: { name: string; gst_number: string | null } | null;
}

export function useEInvoices() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const queryKey = ["gst-einvoices", companyId];

  const query = useQuery({
    enabled: !!companyId,
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, grand_total, subtotal, cgst_total, sgst_total, igst_total, status, irn, einvoice_irn, qr_code_data, einvoice_payload, place_of_supply, customers(name, gst_number)")
        .eq("company_id", companyId!)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EInvoiceLive[];
    },
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase.from("invoices").update(values as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (e: Error) => toast.error(e.message),
  });

  return { invoices: query.data ?? [], isLoading: query.isLoading, patch: patch.mutateAsync, patching: patch.isPending };
}

/* ------------------------------------------------------------------ */
/* e-Way bills (live delivery notes)                                   */
/* ------------------------------------------------------------------ */
export interface EwayLive {
  id: string;
  dn_no: string;
  delivery_date: string;
  vehicle_no: string | null;
  transporter_name: string | null;
  eway_bill_no: string | null;
  place_of_supply: string | null;
  status: string;
  customers: { name: string; gst_number: string | null } | null;
}

export function useEwayBills() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const queryKey = ["gst-eway", companyId];

  const query = useQuery({
    enabled: !!companyId,
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_notes")
        .select("id, dn_no, delivery_date, vehicle_no, transporter_name, eway_bill_no, place_of_supply, status, customers(name, gst_number)")
        .eq("company_id", companyId!)
        .order("delivery_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EwayLive[];
    },
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase.from("delivery_notes").update(values as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (e: Error) => toast.error(e.message),
  });

  return { rows: query.data ?? [], isLoading: query.isLoading, patch: patch.mutateAsync, patching: patch.isPending };
}

/* ------------------------------------------------------------------ */
/* GSTR filings (settings-backed log over live ledger periods)         */
/* ------------------------------------------------------------------ */
export interface GstrFiling {
  key: string; // e.g. GSTR1-2026-07
  arn: string;
  filedAt: string;
  status: "filed";
}
export const useGstrFilings = () => useGstSetting<GstrFiling[]>("gstr_filings", []);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.error("Nothing to export");
    return;
  }
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${filename} downloaded`);
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}
export function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m) - 1]}-${y}`;
}
