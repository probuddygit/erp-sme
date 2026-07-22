// Dummy data + reusable types for the Finance module. In-memory only.

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type EntryType =
  | "journal"
  | "payment"
  | "receipt"
  | "contra"
  | "credit_note"
  | "debit_note";
export type EntryStatus = "draft" | "posted" | "pending" | "approved" | "rejected" | "cancelled";

export interface Account {
  code: string;
  name: string;
  type: AccountType;
  group: string;
  parent?: string;
  isGroup?: boolean;
  openingBalance: number; // debit(+) / credit(-)
}

export interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface Attachment { id: string; name: string; size: string; uploadedAt: string; uploadedBy: string; }
export interface Comment { id: string; author: string; when: string; body: string; }
export interface Timeline { id: string; label: string; when: string; actor?: string; }
export interface AuditEntry { id: string; when: string; actor: string; action: string; from?: string; to?: string; }

export interface FinanceEntry {
  id: string;
  type: EntryType;
  number: string;
  date: string;
  status: EntryStatus;
  approvalStatus: "draft" | "pending" | "approved" | "rejected";
  party?: string;
  partyCode?: string;
  reference?: string;
  narration: string;
  currency: "INR";
  mode?: "cash" | "bank" | "cheque" | "upi" | "neft" | "rtgs";
  instrument?: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  attachments: Attachment[];
  comments: Comment[];
  timeline: Timeline[];
  audit: AuditEntry[];
}

export const STATUS_TONES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  posted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  cancelled: "bg-slate-200 text-slate-700 border-slate-300",
};

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const formatINRSigned = (n: number) => (n < 0 ? `(${formatINR(Math.abs(n))})` : formatINR(n));

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10 + (n % 6), (n * 11) % 60, 0, 0);
  return d.toISOString();
};

// ------------------- Chart of Accounts ----------------------------

export const CHART_OF_ACCOUNTS: Account[] = [
  // Assets
  { code: "1000", name: "Assets", type: "asset", group: "Assets", isGroup: true, openingBalance: 0 },
  { code: "1100", name: "Current Assets", type: "asset", group: "Assets", parent: "1000", isGroup: true, openingBalance: 0 },
  { code: "1110", name: "Cash in Hand", type: "asset", group: "Current Assets", parent: "1100", openingBalance: 125000 },
  { code: "1120", name: "HDFC Bank — 3421", type: "asset", group: "Current Assets", parent: "1100", openingBalance: 1845000 },
  { code: "1121", name: "ICICI Bank — 8890", type: "asset", group: "Current Assets", parent: "1100", openingBalance: 620000 },
  { code: "1200", name: "Accounts Receivable", type: "asset", group: "Current Assets", parent: "1100", openingBalance: 2340000 },
  { code: "1300", name: "Inventory", type: "asset", group: "Current Assets", parent: "1100", openingBalance: 4120000 },
  { code: "1400", name: "Input GST", type: "asset", group: "Current Assets", parent: "1100", openingBalance: 82000 },
  { code: "1500", name: "Fixed Assets", type: "asset", group: "Assets", parent: "1000", isGroup: true, openingBalance: 0 },
  { code: "1510", name: "Plant & Machinery", type: "asset", group: "Fixed Assets", parent: "1500", openingBalance: 8500000 },
  { code: "1520", name: "Office Equipment", type: "asset", group: "Fixed Assets", parent: "1500", openingBalance: 450000 },
  { code: "1530", name: "Furniture & Fixtures", type: "asset", group: "Fixed Assets", parent: "1500", openingBalance: 320000 },

  // Liabilities
  { code: "2000", name: "Liabilities", type: "liability", group: "Liabilities", isGroup: true, openingBalance: 0 },
  { code: "2100", name: "Current Liabilities", type: "liability", group: "Liabilities", parent: "2000", isGroup: true, openingBalance: 0 },
  { code: "2110", name: "Accounts Payable", type: "liability", group: "Current Liabilities", parent: "2100", openingBalance: -1680000 },
  { code: "2120", name: "Output GST", type: "liability", group: "Current Liabilities", parent: "2100", openingBalance: -195000 },
  { code: "2130", name: "TDS Payable", type: "liability", group: "Current Liabilities", parent: "2100", openingBalance: -42000 },
  { code: "2140", name: "Salary Payable", type: "liability", group: "Current Liabilities", parent: "2100", openingBalance: -280000 },
  { code: "2200", name: "Long Term Loans", type: "liability", group: "Liabilities", parent: "2000", openingBalance: -3500000 },

  // Equity
  { code: "3000", name: "Equity", type: "equity", group: "Equity", isGroup: true, openingBalance: 0 },
  { code: "3100", name: "Share Capital", type: "equity", group: "Equity", parent: "3000", openingBalance: -5000000 },
  { code: "3200", name: "Retained Earnings", type: "equity", group: "Equity", parent: "3000", openingBalance: -2140000 },

  // Revenue
  { code: "4000", name: "Revenue", type: "revenue", group: "Revenue", isGroup: true, openingBalance: 0 },
  { code: "4100", name: "Sales — Products", type: "revenue", group: "Revenue", parent: "4000", openingBalance: -8420000 },
  { code: "4200", name: "Sales — Services", type: "revenue", group: "Revenue", parent: "4000", openingBalance: -1250000 },
  { code: "4300", name: "Other Income", type: "revenue", group: "Revenue", parent: "4000", openingBalance: -180000 },

  // Expenses
  { code: "5000", name: "Cost of Goods Sold", type: "expense", group: "COGS", isGroup: true, openingBalance: 0 },
  { code: "5100", name: "Raw Material Consumed", type: "expense", group: "COGS", parent: "5000", openingBalance: 4820000 },
  { code: "5200", name: "Direct Labour", type: "expense", group: "COGS", parent: "5000", openingBalance: 980000 },
  { code: "6000", name: "Operating Expenses", type: "expense", group: "OpEx", isGroup: true, openingBalance: 0 },
  { code: "6100", name: "Salaries & Wages", type: "expense", group: "OpEx", parent: "6000", openingBalance: 1420000 },
  { code: "6200", name: "Rent", type: "expense", group: "OpEx", parent: "6000", openingBalance: 360000 },
  { code: "6300", name: "Electricity", type: "expense", group: "OpEx", parent: "6000", openingBalance: 245000 },
  { code: "6400", name: "Marketing", type: "expense", group: "OpEx", parent: "6000", openingBalance: 185000 },
  { code: "6500", name: "Bank Charges", type: "expense", group: "OpEx", parent: "6000", openingBalance: 24000 },
  { code: "6600", name: "Depreciation", type: "expense", group: "OpEx", parent: "6000", openingBalance: 425000 },
];

const acc = (code: string) => {
  const a = CHART_OF_ACCOUNTS.find((x) => x.code === code)!;
  return { code: a.code, name: a.name };
};

const nextId = (() => {
  let n = 1000;
  return () => `FIN-${++n}`;
})();

function makeEntry(input: {
  type: EntryType;
  number: string;
  date: string;
  status: EntryStatus;
  approval?: "draft" | "pending" | "approved" | "rejected";
  party?: string;
  partyCode?: string;
  reference?: string;
  narration: string;
  mode?: FinanceEntry["mode"];
  instrument?: string;
  lines: { code: string; description?: string; debit?: number; credit?: number }[];
  createdBy?: string;
}): FinanceEntry {
  const lines: JournalLine[] = input.lines.map((l, i) => {
    const a = acc(l.code);
    return {
      id: `L-${input.number}-${i}`,
      accountCode: a.code,
      accountName: a.name,
      description: l.description,
      debit: l.debit ?? 0,
      credit: l.credit ?? 0,
    };
  });
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const createdBy = input.createdBy ?? "Priya Menon";
  return {
    id: nextId(),
    type: input.type,
    number: input.number,
    date: input.date,
    status: input.status,
    approvalStatus: input.approval ?? (input.status === "posted" ? "approved" : "draft"),
    party: input.party,
    partyCode: input.partyCode,
    reference: input.reference,
    narration: input.narration,
    currency: "INR",
    mode: input.mode,
    instrument: input.instrument,
    lines,
    totalDebit,
    totalCredit,
    createdBy,
    attachments: [
      { id: `at-${input.number}-1`, name: "voucher.pdf", size: "128 KB", uploadedAt: input.date, uploadedBy: createdBy },
    ],
    comments: [
      { id: `cm-${input.number}-1`, author: createdBy, when: input.date, body: "Auto-generated from source document." },
    ],
    timeline: [
      { id: `tl-${input.number}-1`, label: "Entry created", when: input.date, actor: createdBy },
      ...(input.status === "posted"
        ? [{ id: `tl-${input.number}-2`, label: "Posted to ledger", when: input.date, actor: "Neha Verma" }]
        : []),
    ],
    audit: [
      { id: `au-${input.number}-1`, when: input.date, actor: createdBy, action: "Created entry" },
      ...(input.status === "posted"
        ? [{ id: `au-${input.number}-2`, when: input.date, actor: "Neha Verma", action: "Posted entry" }]
        : []),
    ],
  };
}

// ------------------- Seed entries ---------------------------------

export const JOURNAL_ENTRIES: FinanceEntry[] = [
  makeEntry({
    type: "journal", number: "JV-2024-0001", date: daysAgo(28), status: "posted",
    narration: "Depreciation for the month — Plant & Machinery",
    lines: [
      { code: "6600", debit: 85000, description: "Monthly depreciation" },
      { code: "1510", credit: 85000, description: "Accumulated depreciation" },
    ],
  }),
  makeEntry({
    type: "journal", number: "JV-2024-0002", date: daysAgo(21), status: "posted",
    narration: "Salary accrual for October",
    lines: [
      { code: "6100", debit: 240000 },
      { code: "2140", credit: 240000 },
    ],
  }),
  makeEntry({
    type: "journal", number: "JV-2024-0003", date: daysAgo(14), status: "pending", approval: "pending",
    narration: "Provision for electricity — Sept billing",
    lines: [
      { code: "6300", debit: 46500 },
      { code: "2110", credit: 46500 },
    ],
  }),
  makeEntry({
    type: "journal", number: "JV-2024-0004", date: daysAgo(7), status: "draft", approval: "draft",
    narration: "TDS on rent — Section 194I",
    lines: [
      { code: "6200", debit: 60000 },
      { code: "2130", credit: 6000 },
      { code: "2110", credit: 54000 },
    ],
  }),
  makeEntry({
    type: "journal", number: "JV-2024-0005", date: daysAgo(3), status: "posted",
    narration: "Raw material issued to production — batch RM-1042",
    lines: [
      { code: "5100", debit: 385000 },
      { code: "1300", credit: 385000 },
    ],
  }),
];

export const PAYMENTS: FinanceEntry[] = [
  makeEntry({
    type: "payment", number: "PAY-2024-0101", date: daysAgo(22), status: "posted",
    party: "Kapoor Fabricators", partyCode: "VN-104", reference: "PI-2024-0088",
    mode: "neft", instrument: "NEFT/HDFC/N08765",
    narration: "Payment to vendor Kapoor Fabricators against PI-2024-0088",
    lines: [
      { code: "2110", debit: 148500 },
      { code: "1120", credit: 148500 },
    ],
  }),
  makeEntry({
    type: "payment", number: "PAY-2024-0102", date: daysAgo(15), status: "posted",
    party: "Sundaram Textiles", partyCode: "VN-201", reference: "PI-2024-0102",
    mode: "rtgs", instrument: "RTGS/ICIC/R11223",
    narration: "Vendor payment — Sundaram Textiles",
    lines: [
      { code: "2110", debit: 62800 },
      { code: "1121", credit: 62800 },
    ],
  }),
  makeEntry({
    type: "payment", number: "PAY-2024-0103", date: daysAgo(9), status: "pending", approval: "pending",
    party: "BSES Electricity Ltd", partyCode: "VN-EXP-01", mode: "upi", instrument: "UPI/bses@icici",
    narration: "Electricity bill — Oct",
    lines: [
      { code: "6300", debit: 46500 },
      { code: "1120", credit: 46500 },
    ],
  }),
  makeEntry({
    type: "payment", number: "PAY-2024-0104", date: daysAgo(4), status: "draft", approval: "draft",
    party: "GST — CBIC", mode: "neft",
    narration: "GSTR-3B tax payment for Sep",
    lines: [
      { code: "2120", debit: 195000 },
      { code: "1120", credit: 195000 },
    ],
  }),
];

export const RECEIPTS: FinanceEntry[] = [
  makeEntry({
    type: "receipt", number: "REC-2024-0201", date: daysAgo(24), status: "posted",
    party: "Bhatt Engineering", partyCode: "CU-203", reference: "INV-2024-1122",
    mode: "neft", instrument: "NEFT/HDFC/IN45332",
    narration: "Receipt against invoice INV-2024-1122",
    lines: [
      { code: "1120", debit: 184000 },
      { code: "1200", credit: 184000 },
    ],
  }),
  makeEntry({
    type: "receipt", number: "REC-2024-0202", date: daysAgo(17), status: "posted",
    party: "Deshmukh Auto Parts", partyCode: "CU-204", reference: "INV-2024-1130",
    mode: "cheque", instrument: "CHQ/HDFC/456712",
    narration: "Cheque received — Deshmukh Auto Parts",
    lines: [
      { code: "1120", debit: 96500 },
      { code: "1200", credit: 96500 },
    ],
  }),
  makeEntry({
    type: "receipt", number: "REC-2024-0203", date: daysAgo(10), status: "posted",
    party: "Menon Foods", partyCode: "CU-208", reference: "INV-2024-1141",
    mode: "upi", instrument: "UPI/menon@axl",
    narration: "Advance receipt for order SO-1078",
    lines: [
      { code: "1121", debit: 55000 },
      { code: "1200", credit: 55000 },
    ],
  }),
  makeEntry({
    type: "receipt", number: "REC-2024-0204", date: daysAgo(5), status: "pending", approval: "pending",
    party: "Iyer Chemicals", partyCode: "CU-207", reference: "INV-2024-1148",
    mode: "rtgs",
    narration: "Partial payment received — Iyer Chemicals",
    lines: [
      { code: "1120", debit: 42000 },
      { code: "1200", credit: 42000 },
    ],
  }),
];

export const CONTRA_ENTRIES: FinanceEntry[] = [
  makeEntry({
    type: "contra", number: "CNT-2024-0301", date: daysAgo(20), status: "posted",
    narration: "Cash deposit into HDFC Bank",
    lines: [
      { code: "1120", debit: 150000 },
      { code: "1110", credit: 150000 },
    ],
  }),
  makeEntry({
    type: "contra", number: "CNT-2024-0302", date: daysAgo(11), status: "posted",
    narration: "Fund transfer HDFC → ICICI",
    lines: [
      { code: "1121", debit: 500000 },
      { code: "1120", credit: 500000 },
    ],
  }),
  makeEntry({
    type: "contra", number: "CNT-2024-0303", date: daysAgo(2), status: "draft", approval: "draft",
    narration: "Cash withdrawal for petty cash",
    lines: [
      { code: "1110", debit: 25000 },
      { code: "1120", credit: 25000 },
    ],
  }),
];

export const CREDIT_NOTES: FinanceEntry[] = [
  makeEntry({
    type: "credit_note", number: "CN-2024-0401", date: daysAgo(18), status: "posted",
    party: "Sundaram Textiles", partyCode: "CU-201", reference: "INV-2024-1108",
    narration: "Credit note for goods returned — 4 units defective",
    lines: [
      { code: "4100", debit: 24000 },
      { code: "2120", debit: 4320 },
      { code: "1200", credit: 28320 },
    ],
  }),
  makeEntry({
    type: "credit_note", number: "CN-2024-0402", date: daysAgo(6), status: "pending", approval: "pending",
    party: "KM Steel Works", partyCode: "CU-205", reference: "INV-2024-1139",
    narration: "Rate difference adjustment — CN vs. original invoice",
    lines: [
      { code: "4100", debit: 8500 },
      { code: "2120", debit: 1530 },
      { code: "1200", credit: 10030 },
    ],
  }),
];

export const DEBIT_NOTES: FinanceEntry[] = [
  makeEntry({
    type: "debit_note", number: "DN-2024-0501", date: daysAgo(19), status: "posted",
    party: "Kapoor Fabricators", partyCode: "VN-104", reference: "PI-2024-0071",
    narration: "Debit note — material short received against PO-4489",
    lines: [
      { code: "2110", debit: 15600 },
      { code: "5100", credit: 13220 },
      { code: "1400", credit: 2380 },
    ],
  }),
  makeEntry({
    type: "debit_note", number: "DN-2024-0502", date: daysAgo(8), status: "posted",
    party: "Pillai Polymers", partyCode: "VN-208", reference: "PI-2024-0093",
    narration: "Debit note — price variance recovered from vendor",
    lines: [
      { code: "2110", debit: 9800 },
      { code: "5100", credit: 8300 },
      { code: "1400", credit: 1500 },
    ],
  }),
];

export const ALL_ENTRIES: FinanceEntry[] = [
  ...JOURNAL_ENTRIES, ...PAYMENTS, ...RECEIPTS, ...CONTRA_ENTRIES, ...CREDIT_NOTES, ...DEBIT_NOTES,
];

// ------------------- Derived: Ledger / Trial / BS / PL / CF -------

export interface LedgerRow {
  entryId: string;
  number: string;
  date: string;
  type: EntryType;
  narration: string;
  reference?: string;
  debit: number;
  credit: number;
  running: number;
}

export function computeLedger(accountCode: string): { opening: number; rows: LedgerRow[]; closing: number } {
  const acct = CHART_OF_ACCOUNTS.find((a) => a.code === accountCode);
  const opening = acct?.openingBalance ?? 0;
  const posted = ALL_ENTRIES.filter((e) => e.status === "posted");
  const rows: LedgerRow[] = [];
  let running = opening;
  for (const e of posted.sort((a, b) => (a.date < b.date ? -1 : 1))) {
    for (const l of e.lines.filter((x) => x.accountCode === accountCode)) {
      running += l.debit - l.credit;
      rows.push({
        entryId: e.id, number: e.number, date: e.date, type: e.type,
        narration: l.description ?? e.narration, reference: e.reference,
        debit: l.debit, credit: l.credit, running,
      });
    }
  }
  return { opening, rows, closing: running };
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
}

export function computeTrialBalance(): TrialBalanceRow[] {
  const totals: Record<string, number> = {};
  for (const a of CHART_OF_ACCOUNTS) totals[a.code] = a.openingBalance;
  for (const e of ALL_ENTRIES.filter((x) => x.status === "posted")) {
    for (const l of e.lines) totals[l.accountCode] = (totals[l.accountCode] ?? 0) + l.debit - l.credit;
  }
  return CHART_OF_ACCOUNTS.filter((a) => !a.isGroup).map((a) => {
    const bal = totals[a.code] ?? 0;
    return {
      code: a.code, name: a.name, type: a.type,
      debit: bal > 0 ? bal : 0,
      credit: bal < 0 ? -bal : 0,
    };
  });
}

export function accountBalance(code: string): number {
  const acct = CHART_OF_ACCOUNTS.find((a) => a.code === code);
  let bal = acct?.openingBalance ?? 0;
  for (const e of ALL_ENTRIES.filter((x) => x.status === "posted")) {
    for (const l of e.lines.filter((x) => x.accountCode === code)) bal += l.debit - l.credit;
  }
  return bal;
}

export function groupBalance(codes: string[]): number {
  return codes.reduce((s, c) => s + accountBalance(c), 0);
}

export const ENTRY_META: Record<EntryType, { label: string; short: string; prefix: string }> = {
  journal: { label: "Journal Entry", short: "Journal", prefix: "JV" },
  payment: { label: "Payment Voucher", short: "Payment", prefix: "PAY" },
  receipt: { label: "Receipt Voucher", short: "Receipt", prefix: "REC" },
  contra: { label: "Contra Entry", short: "Contra", prefix: "CNT" },
  credit_note: { label: "Credit Note", short: "Credit Note", prefix: "CN" },
  debit_note: { label: "Debit Note", short: "Debit Note", prefix: "DN" },
};