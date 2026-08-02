import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type {
  Account, AccountType, EntryStatus, EntryType, FinanceEntry, JournalLine, LedgerRow, TrialBalanceRow,
} from "@/features/finance/data";

function useCompanyId() {
  const { profile, company } = useAuth() as any;
  return (company?.id ?? profile?.company_id ?? null) as string | null;
}

const TYPE_GROUP: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};

/** Chart of accounts straight from the ledger master. */
export function useAccounts() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ["fin", "accounts", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, code, name, type, parent_id, is_active")
        .eq("company_id", companyId!)
        .order("code");
      if (error) throw error;
      const rows = data ?? [];
      const byId = new Map(rows.map((r) => [r.id, r]));
      const parents = new Set(rows.map((r) => r.parent_id).filter(Boolean) as string[]);
      return rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type as AccountType,
        group: r.parent_id ? (byId.get(r.parent_id)?.name ?? TYPE_GROUP[r.type as AccountType]) : TYPE_GROUP[r.type as AccountType],
        parent: r.parent_id ? byId.get(r.parent_id)?.code : undefined,
        isGroup: parents.has(r.id),
        openingBalance: 0,
      })) as (Account & { id: string })[];
    },
  });
}

/** Classify a ledger posting into the voucher family the Finance pages expect. */
function classify(module: string | null, sourceType: string | null): EntryType {
  const m = (module ?? "").toLowerCase();
  const t = (sourceType ?? "").toLowerCase();
  if (t.includes("credit_note") || t.includes("sales_return")) return "credit_note";
  if (t.includes("debit_note") || t.includes("vendor_return")) return "debit_note";
  if (t === "contra") return "contra";
  if (t === "payment" && m === "sales") return "receipt";
  if (t.includes("payment") || t === "payroll_run") return "payment";
  return "journal";
}

const MODULE_LABEL: Record<string, string> = {
  sales: "Sales",
  procurement: "Procurement",
  inventory: "Inventory",
  production: "Production",
  hr: "Payroll",
  finance: "Finance",
};

export interface LiveFinanceEntry extends FinanceEntry {
  sourceModule: string;
  sourceType: string | null;
  sourceId: string | null;
}

/** All ledger postings for the tenant, including everything auto-posted by upstream modules. */
export function useJournalEntries() {
  const companyId = useCompanyId();
  const accounts = useAccounts();
  const accById = useMemo(
    () => new Map((accounts.data ?? []).map((a) => [a.id, a])),
    [accounts.data],
  );

  const q = useQuery({
    queryKey: ["fin", "journal", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("company_id", companyId!)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      const entries = data ?? [];
      const { data: lineRows, error: lErr } = await supabase
        .from("journal_lines")
        .select("*")
        .eq("company_id", companyId!)
        .order("position");
      if (lErr) throw lErr;
      const byEntry = new Map<string, any[]>();
      (lineRows ?? []).forEach((l) => {
        const arr = byEntry.get(l.entry_id) ?? [];
        arr.push(l);
        byEntry.set(l.entry_id, arr);
      });
      return { entries, byEntry };
    },
  });

  const data = useMemo<LiveFinanceEntry[]>(() => {
    if (!q.data) return [];
    return q.data.entries.map((e: any) => {
      const raw = q.data!.byEntry.get(e.id) ?? [];
      const lines: JournalLine[] = raw.map((l: any) => {
        const a = accById.get(l.account_id);
        return {
          id: l.id,
          accountCode: a?.code ?? "—",
          accountName: a?.name ?? "Unmapped account",
          description: l.description ?? undefined,
          debit: Number(l.debit ?? 0),
          credit: Number(l.credit ?? 0),
        };
      });
      const status = (e.status ?? "posted") as EntryStatus;
      const module = e.source_module ?? "finance";
      return {
        id: e.id,
        type: classify(module, e.source_type),
        number: e.entry_number,
        date: e.entry_date,
        status,
        approvalStatus: status === "posted" ? "approved" : "draft",
        party: MODULE_LABEL[module] ?? module,
        partyCode: e.source_type ?? undefined,
        reference: e.source_type ? `${MODULE_LABEL[module] ?? module} · ${e.source_type}` : undefined,
        narration: e.narration ?? "—",
        currency: "INR" as const,
        lines,
        totalDebit: Number(e.total_debit ?? 0),
        totalCredit: Number(e.total_credit ?? 0),
        createdBy: MODULE_LABEL[module] ?? "System",
        attachments: [],
        comments: [],
        timeline: [
          { id: `${e.id}-created`, label: "Entry created", when: e.created_at, actor: MODULE_LABEL[module] ?? "System" },
          ...(status === "posted"
            ? [{ id: `${e.id}-posted`, label: "Posted to ledger", when: e.updated_at ?? e.created_at, actor: "Auto-posting" }]
            : []),
        ],
        audit: [
          { id: `${e.id}-a1`, when: e.created_at, actor: MODULE_LABEL[module] ?? "System", action: `Generated from ${e.source_type ?? "manual entry"}` },
        ],
        sourceModule: module,
        sourceType: e.source_type ?? null,
        sourceId: e.source_id ?? null,
      };
    });
  }, [q.data, accById]);

  return { ...q, data, isLoading: q.isLoading || accounts.isLoading };
}

/** Everything the Finance pages need, derived from live ledger data. */
export function useFinanceBook() {
  const accountsQ = useAccounts();
  const entriesQ = useJournalEntries();
  const accounts = accountsQ.data ?? [];
  const entries = entriesQ.data;
  const isLoading = accountsQ.isLoading || entriesQ.isLoading;

  return useMemo(() => {
    const posted = entries.filter((e) => e.status === "posted");

    const balances = new Map<string, number>();
    for (const a of accounts) balances.set(a.code, 0);
    for (const e of posted)
      for (const l of e.lines)
        balances.set(l.accountCode, (balances.get(l.accountCode) ?? 0) + l.debit - l.credit);

    const accountBalance = (code: string) => balances.get(code) ?? 0;
    const leaves = (type: AccountType) => accounts.filter((a) => a.type === type && !a.isGroup);

    const byType = (t: EntryType) => entries.filter((e) => e.type === t);

    const computeLedger = (code: string): { opening: number; rows: LedgerRow[]; closing: number } => {
      const rows: LedgerRow[] = [];
      let running = 0;
      for (const e of [...posted].sort((a, b) => (a.date < b.date ? -1 : 1)))
        for (const l of e.lines.filter((x) => x.accountCode === code)) {
          running += l.debit - l.credit;
          rows.push({
            entryId: e.id, number: e.number, date: e.date, type: e.type,
            narration: l.description ?? e.narration, reference: e.reference,
            debit: l.debit, credit: l.credit, running,
          });
        }
      return { opening: 0, rows, closing: running };
    };

    const computeTrialBalance = (): TrialBalanceRow[] =>
      accounts.filter((a) => !a.isGroup).map((a) => {
        const bal = accountBalance(a.code);
        return { code: a.code, name: a.name, type: a.type, debit: bal > 0 ? bal : 0, credit: bal < 0 ? -bal : 0 };
      });

    return { accounts, entries, posted, isLoading, accountBalance, leaves, byType, computeLedger, computeTrialBalance };
  }, [accounts, entries, isLoading]);
}

/** Codes are seeded by the tenant chart-of-accounts template. */
export const CASH_CODES = ["1000", "1010"];
export const AR_CODE = "1100";
export const AP_CODE = "2000";
export const GST_OUTPUT_CODE = "2100";
export const GST_INPUT_CODE = "1300";

export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}