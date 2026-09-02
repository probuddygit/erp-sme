import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function useCompanyId() {
  const { profile, company } = useAuth() as any;
  return (company?.id ?? profile?.company_id ?? null) as string | null;
}

export interface BankAccount {
  id: string;
  company_id: string;
  name: string;
  bank_name: string | null;
  account_number: string | null;
  ifsc: string | null;
  branch: string | null;
  account_type: string;
  gl_account_id: string | null;
  opening_balance: number;
  currency: string;
  is_active: boolean;
  notes: string | null;
}

export interface StatementLine {
  id: string;
  company_id: string;
  bank_account_id: string;
  txn_date: string;
  description: string | null;
  reference: string | null;
  deposit: number;
  withdrawal: number;
  running_balance: number | null;
  import_batch: string | null;
  match_status: string;
  matched_doc_kind: string | null;
  matched_doc_id: string | null;
  reconciled_at: string | null;
}

export interface MatchSuggestion {
  doc_kind: string;
  doc_id: string;
  doc_number: string | null;
  doc_date: string;
  amount: number;
  party: string;
  score: number;
}

// ---------- Bank accounts ----------
export function useBankAccounts() {
  const companyId = useCompanyId();
  return useQuery({
    enabled: !!companyId,
    queryKey: ["bank-accounts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as BankAccount[];
    },
  });
}

export function useSaveBankAccount() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  const { user } = useAuth() as any;
  return useMutation({
    mutationFn: async (v: Partial<BankAccount> & { id?: string }) => {
      if (!companyId) throw new Error("No company selected");
      const payload: any = {
        company_id: companyId,
        name: v.name,
        bank_name: v.bank_name ?? null,
        account_number: v.account_number ?? null,
        ifsc: v.ifsc ?? null,
        branch: v.branch ?? null,
        account_type: v.account_type ?? "current",
        gl_account_id: v.gl_account_id || null,
        opening_balance: Number(v.opening_balance ?? 0),
        is_active: v.is_active ?? true,
        notes: v.notes ?? null,
      };
      if (v.id) {
        const { error } = await supabase.from("bank_accounts").update(payload).eq("id", v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bank_accounts").insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      qc.invalidateQueries({ queryKey: ["bank-reco"] });
      toast.success("Bank account saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Bank account deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });
}

// ---------- Statement lines ----------
export function useStatementLines(bankAccountId?: string | null) {
  const companyId = useCompanyId();
  return useQuery({
    enabled: !!companyId,
    queryKey: ["bank-statement-lines", companyId, bankAccountId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("bank_statement_lines")
        .select("*")
        .eq("company_id", companyId!)
        .order("txn_date", { ascending: false });
      if (bankAccountId) q = q.eq("bank_account_id", bankAccountId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as StatementLine[];
    },
  });
}

export interface ImportRow {
  txn_date: string;
  description?: string;
  reference?: string;
  deposit?: number;
  withdrawal?: number;
  running_balance?: number | null;
}

export function useImportStatement() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  const { user } = useAuth() as any;
  return useMutation({
    mutationFn: async ({ bankAccountId, rows }: { bankAccountId: string; rows: ImportRow[] }) => {
      if (!companyId) throw new Error("No company selected");
      if (!rows.length) throw new Error("Nothing to import");
      const batch = `IMP-${new Date().toISOString().slice(0, 19)}`;
      const payload = rows.map((r) => ({
        company_id: companyId,
        bank_account_id: bankAccountId,
        txn_date: r.txn_date,
        description: r.description ?? null,
        reference: r.reference ?? null,
        deposit: Number(r.deposit ?? 0),
        withdrawal: Number(r.withdrawal ?? 0),
        running_balance: r.running_balance ?? null,
        import_batch: batch,
        created_by: user?.id ?? null,
      }));
      const { error } = await supabase.from("bank_statement_lines").insert(payload as any);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["bank-statement-lines"] });
      qc.invalidateQueries({ queryKey: ["bank-reco"] });
      toast.success(`${n} statement lines imported`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Import failed"),
  });
}

export function useDeleteStatementLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_statement_lines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statement-lines"] });
      toast.success("Line removed");
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });
}

export function useMatchSuggestions(lineId?: string | null) {
  return useQuery({
    enabled: !!lineId,
    queryKey: ["bank-match-suggestions", lineId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("suggest_bank_matches", { _line_id: lineId });
      if (error) throw error;
      return (data ?? []) as MatchSuggestion[];
    },
  });
}

export function useReconcileLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lineId, docKind, docId }: { lineId: string; docKind: string; docId: string }) => {
      const { data, error } = await (supabase as any).rpc("reconcile_bank_line", {
        _line_id: lineId, _doc_kind: docKind, _doc_id: docId,
      });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.error ?? "Could not reconcile");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statement-lines"] });
      qc.invalidateQueries({ queryKey: ["bank-reco"] });
      qc.invalidateQueries({ queryKey: ["bank-match-suggestions"] });
      toast.success("Line reconciled");
    },
    onError: (e: any) => toast.error(e?.message ?? "Reconcile failed"),
  });
}

export function useUnreconcileLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lineId: string) => {
      const { data, error } = await (supabase as any).rpc("unreconcile_bank_line", { _line_id: lineId });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.error ?? "Could not undo");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statement-lines"] });
      qc.invalidateQueries({ queryKey: ["bank-reco"] });
      toast.success("Reconciliation removed");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
}

export interface RecoSummaryRow {
  bank_account_id: string;
  name: string;
  book_balance: number;
  statement_balance: number;
  unreconciled_lines: number;
  unreconciled_amount: number;
}

export function useReconciliationSummary() {
  const companyId = useCompanyId();
  return useQuery({
    enabled: !!companyId,
    queryKey: ["bank-reco", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("bank_reconciliation_summary", { _company_id: companyId });
      if (error) throw error;
      return (data ?? []) as RecoSummaryRow[];
    },
  });
}

// ---------- Manual vouchers ----------
export interface VoucherLine { account_id: string; debit: number; credit: number; description?: string }

export function usePostVoucher() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (v: { date: string; narration: string; kind?: string; lines: VoucherLine[] }) => {
      if (!companyId) throw new Error("No company selected");
      const { data, error } = await (supabase as any).rpc("post_manual_voucher", {
        _company_id: companyId,
        _date: v.date,
        _narration: v.narration,
        _lines: v.lines,
        _kind: v.kind ?? "journal",
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin"] });
      toast.success("Voucher posted to the ledger");
    },
    onError: (e: any) => toast.error(e?.message ?? "Posting failed"),
  });
}

/** Parse a bank statement CSV: date, description, reference, deposit, withdrawal, balance. */
export function parseStatementCsv(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const split = (l: string) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const header = split(lines[0]).map((h) => h.toLowerCase());
  const idx = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const iDate = idx("date");
  const iDesc = idx("description", "narration", "particular");
  const iRef = idx("ref", "cheque", "utr");
  const iDep = idx("deposit", "credit", "cr");
  const iWd = idx("withdraw", "debit", "dr");
  const iBal = idx("balance");
  const num = (v?: string) => Number(String(v ?? "").replace(/[^0-9.-]/g, "")) || 0;
  const toIso = (v?: string) => {
    const raw = (v ?? "").trim();
    const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (dmy) {
      const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
      return `${y}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
  };

  return lines.slice(1).map((l) => {
    const c = split(l);
    return {
      txn_date: toIso(iDate >= 0 ? c[iDate] : undefined),
      description: iDesc >= 0 ? c[iDesc] : undefined,
      reference: iRef >= 0 ? c[iRef] : undefined,
      deposit: iDep >= 0 ? num(c[iDep]) : 0,
      withdrawal: iWd >= 0 ? num(c[iWd]) : 0,
      running_balance: iBal >= 0 ? num(c[iBal]) : null,
    };
  }).filter((r) => r.deposit || r.withdrawal);
}
