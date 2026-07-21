// Dummy data for the Sales module. In-memory only, no backend integration.

export type DocType =
  | "quotation"
  | "sales_order"
  | "delivery_note"
  | "invoice"
  | "return"
  | "payment";

export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

export interface Attachment {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Comment {
  id: string;
  author: string;
  createdAt: string;
  body: string;
}

export interface TimelineEvent {
  id: string;
  label: string;
  when: string;
  actor?: string;
}

export interface AuditEntry {
  id: string;
  when: string;
  actor: string;
  action: string;
  field?: string;
  from?: string;
  to?: string;
}

export interface LineItem {
  id: string;
  code: string;
  description: string;
  hsn: string;
  qty: number;
  uom: string;
  rate: number;
  discountPct: number;
  taxRate: number; // GST %
  amount: number; // net (after discount, before tax)
}

export interface TaxRow {
  id: string;
  label: string;
  rate: number;
  amount: number;
}

export interface Transaction {
  id: string;
  docType: DocType;
  number: string;
  date: string;
  status: string;
  approvalStatus: ApprovalStatus;
  approver?: string;

  customer: string;
  customerCode: string;
  gstin?: string;
  billingAddress: string;
  shippingAddress: string;

  reference?: string;
  validUntil?: string;
  dueDate?: string;
  deliveryDate?: string;
  paymentDate?: string;
  paymentMode?: string;
  paymentAmount?: number;
  paidAgainst?: string; // invoice number for a payment

  ownerRep: string;
  currency: "INR";

  items: LineItem[];
  taxes: TaxRow[];
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
  roundOff: number;
  grandTotal: number;

  notes?: string;
  terms?: string;

  attachments: Attachment[];
  comments: Comment[];
  timeline: TimelineEvent[];
  audit: AuditEntry[];
}

export const DOC_META: Record<DocType, { label: string; short: string; prefix: string }> = {
  quotation:     { label: "Quotation",        short: "Quote",     prefix: "QT" },
  sales_order:   { label: "Sales Order",      short: "Order",     prefix: "SO" },
  delivery_note: { label: "Delivery Note",    short: "Delivery",  prefix: "DN" },
  invoice:       { label: "Tax Invoice",      short: "Invoice",   prefix: "INV" },
  return:        { label: "Sales Return",     short: "Return",    prefix: "SR" },
  payment:       { label: "Customer Payment", short: "Receipt",   prefix: "RCP" },
};

export const STATUS_TONES: Record<string, string> = {
  draft:       "bg-slate-100 text-slate-700 border-slate-200",
  sent:        "bg-blue-50 text-blue-700 border-blue-200",
  accepted:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:    "bg-rose-50 text-rose-700 border-rose-200",
  expired:     "bg-amber-50 text-amber-800 border-amber-200",
  confirmed:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  processing:  "bg-blue-50 text-blue-700 border-blue-200",
  fulfilled:   "bg-violet-50 text-violet-700 border-violet-200",
  cancelled:   "bg-rose-50 text-rose-700 border-rose-200",
  dispatched:  "bg-blue-50 text-blue-700 border-blue-200",
  delivered:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_transit:  "bg-amber-50 text-amber-800 border-amber-200",
  paid:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial:     "bg-amber-50 text-amber-800 border-amber-200",
  unpaid:      "bg-rose-50 text-rose-700 border-rose-200",
  overdue:     "bg-rose-50 text-rose-700 border-rose-200",
  approved:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:     "bg-amber-50 text-amber-800 border-amber-200",
  received:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  refunded:    "bg-blue-50 text-blue-700 border-blue-200",
  cleared:     "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export const APPROVAL_TONES: Record<ApprovalStatus, string> = {
  draft:    "bg-slate-100 text-slate-700 border-slate-200",
  pending:  "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// ---------- Customer + item catalogues -----------------------------------

const CUSTOMERS = [
  { code: "CU-201", name: "Sundaram Textiles",   gstin: "33ABCDE1234F1Z5", city: "Coimbatore" },
  { code: "CU-202", name: "Kapoor Fabricators",  gstin: "03KAPOR9876P1Z2", city: "Ludhiana" },
  { code: "CU-203", name: "Bhatt Engineering",   gstin: "27BHATT4567Q1Z9", city: "Pune" },
  { code: "CU-204", name: "Deshmukh Auto Parts", gstin: "27DESHM5678R1Z1", city: "Nashik" },
  { code: "CU-205", name: "KM Steel Works",      gstin: "22KMSTL2345S1Z7", city: "Raipur" },
  { code: "CU-206", name: "Pillai Polymers",     gstin: "32PILLA3456T1Z4", city: "Kochi" },
  { code: "CU-207", name: "Iyer Chemicals",      gstin: "33IYERC6789U1Z3", city: "Chennai" },
  { code: "CU-208", name: "Menon Foods",         gstin: "29MENON7890V1Z8", city: "Bengaluru" },
];

const CATALOG = [
  { code: "ITM-100", desc: "MS Angle 50x50x5mm — 6m",          hsn: "7216", uom: "NOS", rate: 1250,  gst: 18 },
  { code: "ITM-101", desc: "Hex Bolt M12 x 60 (Zinc)",         hsn: "7318", uom: "BOX", rate: 480,   gst: 18 },
  { code: "ITM-102", desc: "Copper Wire 2.5 sqmm (90m coil)",  hsn: "8544", uom: "COIL",rate: 3200,  gst: 18 },
  { code: "ITM-103", desc: "Industrial Bearing 6205 ZZ",       hsn: "8482", uom: "NOS", rate: 640,   gst: 18 },
  { code: "ITM-104", desc: "Hydraulic Oil ISO 68 (210L drum)", hsn: "2710", uom: "DRUM",rate: 18500, gst: 18 },
  { code: "ITM-105", desc: "SS 304 Sheet 2mm (1.25 x 2.5m)",   hsn: "7219", uom: "SHT", rate: 8900,  gst: 18 },
  { code: "ITM-106", desc: "PVC Conduit 25mm x 3m",            hsn: "3917", uom: "NOS", rate: 210,   gst: 18 },
  { code: "ITM-107", desc: "Safety Helmet — ISI (Yellow)",     hsn: "6506", uom: "NOS", rate: 380,   gst: 12 },
];

const REPS = ["Aarav Shah", "Priya Menon", "Rohit Nair", "Sneha Iyer", "Vikram Rao"];

// ---------- Helpers ------------------------------------------------------

const rnd = (seed: number) => {
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + (n % 8), (n * 7) % 60, 0, 0);
  return d.toISOString();
};

function buildItems(seed: number, n: number): { items: LineItem[]; taxes: TaxRow[]; subTotal: number; discountTotal: number; taxTotal: number; grandTotal: number; roundOff: number } {
  const r = rnd(seed);
  const items: LineItem[] = [];
  for (let i = 0; i < n; i++) {
    const c = CATALOG[Math.floor(r() * CATALOG.length)];
    const qty = 1 + Math.floor(r() * 20);
    const discountPct = Math.floor(r() * 5) * 2; // 0..8%
    const gross = qty * c.rate;
    const amount = Math.round(gross * (1 - discountPct / 100));
    items.push({
      id: `LI-${seed}-${i}`,
      code: c.code,
      description: c.desc,
      hsn: c.hsn,
      qty,
      uom: c.uom,
      rate: c.rate,
      discountPct,
      taxRate: c.gst,
      amount,
    });
  }
  const subTotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const discountTotal = items.reduce((s, i) => s + (i.qty * i.rate - i.amount), 0);
  const netTotal = subTotal - discountTotal;

  // Assume intra-state → split CGST/SGST
  const taxBuckets: Record<number, number> = {};
  items.forEach((it) => {
    taxBuckets[it.taxRate] = (taxBuckets[it.taxRate] ?? 0) + Math.round(it.amount * (it.taxRate / 100));
  });
  const taxes: TaxRow[] = [];
  Object.entries(taxBuckets).forEach(([rate, amt]) => {
    const half = Math.round(amt / 2);
    taxes.push({ id: `t-c-${rate}`, label: `CGST @ ${Number(rate) / 2}%`, rate: Number(rate) / 2, amount: half });
    taxes.push({ id: `t-s-${rate}`, label: `SGST @ ${Number(rate) / 2}%`, rate: Number(rate) / 2, amount: amt - half });
  });
  const taxTotal = taxes.reduce((s, t) => s + t.amount, 0);
  const raw = netTotal + taxTotal;
  const rounded = Math.round(raw);
  return {
    items,
    taxes,
    subTotal,
    discountTotal,
    taxTotal,
    roundOff: rounded - raw,
    grandTotal: rounded,
  };
}

function defaultTimeline(t: {
  docType: DocType;
  createdAt: string;
  approvalStatus: ApprovalStatus;
  approver?: string;
  status: string;
}): TimelineEvent[] {
  const evs: TimelineEvent[] = [
    { id: "tl-1", label: `${DOC_META[t.docType].label} created`, when: t.createdAt, actor: "System" },
  ];
  if (t.approvalStatus !== "draft") {
    evs.push({ id: "tl-2", label: "Sent for approval", when: daysAgo(3), actor: "You" });
  }
  if (t.approvalStatus === "approved") {
    evs.push({ id: "tl-3", label: `Approved by ${t.approver ?? "Manager"}`, when: daysAgo(2), actor: t.approver });
  }
  if (t.approvalStatus === "rejected") {
    evs.push({ id: "tl-3", label: `Rejected by ${t.approver ?? "Manager"}`, when: daysAgo(2), actor: t.approver });
  }
  if (["fulfilled", "delivered", "paid", "confirmed", "dispatched"].includes(t.status)) {
    evs.push({ id: "tl-4", label: `Status changed to ${t.status}`, when: daysAgo(1), actor: "System" });
  }
  return evs;
}

function defaultAudit(seed: number): AuditEntry[] {
  return [
    { id: `au-${seed}-1`, when: daysAgo(6), actor: "Aarav Shah",  action: "Created record" },
    { id: `au-${seed}-2`, when: daysAgo(5), actor: "Aarav Shah",  action: "Updated field", field: "Notes", from: "—", to: "Bulk delivery preferred" },
    { id: `au-${seed}-3`, when: daysAgo(4), actor: "Priya Menon", action: "Added line item", field: "Items", to: "ITM-104 × 2" },
    { id: `au-${seed}-4`, when: daysAgo(3), actor: "Rohit Nair",  action: "Submitted for approval" },
  ];
}

function defaultComments(seed: number): Comment[] {
  const pool = [
    "Customer requested faster dispatch — please prioritise.",
    "Confirmed pricing over the call, valid until end of month.",
    "Please attach the revised drawing before sending.",
    "Approved by finance — safe to convert.",
    "GST breakup verified against customer PO.",
  ];
  const r = rnd(seed + 42);
  const n = 1 + Math.floor(r() * 3);
  return Array.from({ length: n }).map((_, i) => ({
    id: `cm-${seed}-${i}`,
    author: REPS[Math.floor(r() * REPS.length)],
    createdAt: daysAgo(i + 1),
    body: pool[Math.floor(r() * pool.length)],
  }));
}

function defaultAttachments(seed: number): Attachment[] {
  const files = [
    { name: "customer-po.pdf",   size: "184 KB" },
    { name: "drawing-rev-b.pdf", size: "612 KB" },
    { name: "price-annexure.xlsx", size: "56 KB" },
    { name: "signed-copy.pdf",   size: "298 KB" },
  ];
  const r = rnd(seed + 7);
  const n = 1 + Math.floor(r() * 3);
  return Array.from({ length: n }).map((_, i) => ({
    id: `at-${seed}-${i}`,
    name: files[i % files.length].name,
    size: files[i % files.length].size,
    uploadedAt: daysAgo(i + 2),
    uploadedBy: REPS[i % REPS.length],
  }));
}

// ---------- Transaction factory -----------------------------------------

interface Seed {
  docType: DocType;
  index: number;
  status: string;
  approvalStatus: ApprovalStatus;
  offsetDays: number;
  customerIdx: number;
  itemsCount?: number;
  ref?: string;
  extra?: Partial<Transaction>;
}

let uid = 1;
function makeTx(s: Seed): Transaction {
  const meta = DOC_META[s.docType];
  const cust = CUSTOMERS[s.customerIdx % CUSTOMERS.length];
  const rep = REPS[s.index % REPS.length];
  const seed = uid++ * 31 + s.index;
  const totals = buildItems(seed, s.itemsCount ?? 2 + (s.index % 3));
  const createdAt = daysAgo(s.offsetDays);
  const number = `${meta.prefix}-${String(1000 + s.index).padStart(4, "0")}`;
  const address = `${cust.name}\nPlot ${100 + s.index}, Industrial Area\n${cust.city}, India`;

  const tx: Transaction = {
    id: `${meta.prefix}-${seed}`,
    docType: s.docType,
    number,
    date: createdAt,
    status: s.status,
    approvalStatus: s.approvalStatus,
    approver: s.approvalStatus === "approved" || s.approvalStatus === "rejected" ? "Neha Verma" : undefined,
    customer: cust.name,
    customerCode: cust.code,
    gstin: cust.gstin,
    billingAddress: address,
    shippingAddress: address,
    reference: s.ref,
    ownerRep: rep,
    currency: "INR",
    ...totals,
    notes: "Prices are inclusive of packing. Delivery ex-works Coimbatore.",
    terms: "Payment within 30 days of invoice. Goods once sold will only be taken back as per return policy.",
    attachments: defaultAttachments(seed),
    comments: defaultComments(seed),
    timeline: [],
    audit: defaultAudit(seed),
    ...s.extra,
  };
  tx.timeline = defaultTimeline({
    docType: tx.docType,
    createdAt,
    approvalStatus: tx.approvalStatus,
    approver: tx.approver,
    status: tx.status,
  });
  return tx;
}

// ---------- Seed data ----------------------------------------------------

export const QUOTATIONS: Transaction[] = [
  makeTx({ docType: "quotation", index: 1, status: "sent",     approvalStatus: "approved", offsetDays: 12, customerIdx: 0, extra: { validUntil: daysAgo(-10) } }),
  makeTx({ docType: "quotation", index: 2, status: "accepted", approvalStatus: "approved", offsetDays: 9,  customerIdx: 1, extra: { validUntil: daysAgo(-15) } }),
  makeTx({ docType: "quotation", index: 3, status: "draft",    approvalStatus: "draft",    offsetDays: 3,  customerIdx: 2, extra: { validUntil: daysAgo(-20) } }),
  makeTx({ docType: "quotation", index: 4, status: "sent",     approvalStatus: "pending",  offsetDays: 6,  customerIdx: 3, extra: { validUntil: daysAgo(-8) } }),
  makeTx({ docType: "quotation", index: 5, status: "expired",  approvalStatus: "approved", offsetDays: 40, customerIdx: 4, extra: { validUntil: daysAgo(10) } }),
  makeTx({ docType: "quotation", index: 6, status: "rejected", approvalStatus: "rejected", offsetDays: 15, customerIdx: 5, extra: { validUntil: daysAgo(-5) } }),
  makeTx({ docType: "quotation", index: 7, status: "accepted", approvalStatus: "approved", offsetDays: 7,  customerIdx: 6, extra: { validUntil: daysAgo(-14) } }),
  makeTx({ docType: "quotation", index: 8, status: "sent",     approvalStatus: "pending",  offsetDays: 2,  customerIdx: 7, extra: { validUntil: daysAgo(-18) } }),
];

export const SALES_ORDERS: Transaction[] = [
  makeTx({ docType: "sales_order", index: 1, status: "confirmed",  approvalStatus: "approved", offsetDays: 10, customerIdx: 0, ref: "QT-1001", extra: { deliveryDate: daysAgo(-5) } }),
  makeTx({ docType: "sales_order", index: 2, status: "processing", approvalStatus: "approved", offsetDays: 7,  customerIdx: 1, ref: "QT-1002", extra: { deliveryDate: daysAgo(-3) } }),
  makeTx({ docType: "sales_order", index: 3, status: "fulfilled",  approvalStatus: "approved", offsetDays: 20, customerIdx: 6, ref: "QT-1007", extra: { deliveryDate: daysAgo(2) } }),
  makeTx({ docType: "sales_order", index: 4, status: "draft",      approvalStatus: "draft",    offsetDays: 1,  customerIdx: 2 }),
  makeTx({ docType: "sales_order", index: 5, status: "cancelled",  approvalStatus: "rejected", offsetDays: 15, customerIdx: 3 }),
  makeTx({ docType: "sales_order", index: 6, status: "confirmed",  approvalStatus: "pending",  offsetDays: 4,  customerIdx: 4, extra: { deliveryDate: daysAgo(-12) } }),
  makeTx({ docType: "sales_order", index: 7, status: "processing", approvalStatus: "approved", offsetDays: 6,  customerIdx: 5, extra: { deliveryDate: daysAgo(-4) } }),
];

export const DELIVERY_NOTES: Transaction[] = [
  makeTx({ docType: "delivery_note", index: 1, status: "delivered",  approvalStatus: "approved", offsetDays: 4,  customerIdx: 0, ref: "SO-1001" }),
  makeTx({ docType: "delivery_note", index: 2, status: "in_transit", approvalStatus: "approved", offsetDays: 1,  customerIdx: 1, ref: "SO-1002" }),
  makeTx({ docType: "delivery_note", index: 3, status: "dispatched", approvalStatus: "approved", offsetDays: 0,  customerIdx: 6, ref: "SO-1003" }),
  makeTx({ docType: "delivery_note", index: 4, status: "draft",      approvalStatus: "draft",    offsetDays: 0,  customerIdx: 4 }),
  makeTx({ docType: "delivery_note", index: 5, status: "delivered",  approvalStatus: "approved", offsetDays: 12, customerIdx: 5, ref: "SO-1007" }),
  makeTx({ docType: "delivery_note", index: 6, status: "in_transit", approvalStatus: "pending",  offsetDays: 2,  customerIdx: 7, ref: "SO-1006" }),
];

export const INVOICES: Transaction[] = [
  makeTx({ docType: "invoice", index: 1, status: "paid",     approvalStatus: "approved", offsetDays: 25, customerIdx: 0, ref: "SO-1001", extra: { dueDate: daysAgo(-5) } }),
  makeTx({ docType: "invoice", index: 2, status: "partial",  approvalStatus: "approved", offsetDays: 18, customerIdx: 1, ref: "SO-1002", extra: { dueDate: daysAgo(-2) } }),
  makeTx({ docType: "invoice", index: 3, status: "unpaid",   approvalStatus: "approved", offsetDays: 8,  customerIdx: 2, ref: "SO-1003", extra: { dueDate: daysAgo(-22) } }),
  makeTx({ docType: "invoice", index: 4, status: "overdue",  approvalStatus: "approved", offsetDays: 45, customerIdx: 4, ref: "SO-1005", extra: { dueDate: daysAgo(15) } }),
  makeTx({ docType: "invoice", index: 5, status: "draft",    approvalStatus: "draft",    offsetDays: 1,  customerIdx: 5 }),
  makeTx({ docType: "invoice", index: 6, status: "unpaid",   approvalStatus: "pending",  offsetDays: 3,  customerIdx: 6, ref: "SO-1006", extra: { dueDate: daysAgo(-27) } }),
  makeTx({ docType: "invoice", index: 7, status: "paid",     approvalStatus: "approved", offsetDays: 30, customerIdx: 7, ref: "SO-1004", extra: { dueDate: daysAgo(0) } }),
];

export const RETURNS: Transaction[] = [
  makeTx({ docType: "return", index: 1, status: "received", approvalStatus: "approved", offsetDays: 6,  customerIdx: 0, ref: "INV-1001", itemsCount: 1 }),
  makeTx({ docType: "return", index: 2, status: "refunded", approvalStatus: "approved", offsetDays: 14, customerIdx: 4, ref: "INV-1004", itemsCount: 2 }),
  makeTx({ docType: "return", index: 3, status: "pending",  approvalStatus: "pending",  offsetDays: 2,  customerIdx: 2, ref: "INV-1003", itemsCount: 1 }),
  makeTx({ docType: "return", index: 4, status: "rejected", approvalStatus: "rejected", offsetDays: 10, customerIdx: 5, ref: "INV-1005", itemsCount: 1 }),
  makeTx({ docType: "return", index: 5, status: "received", approvalStatus: "approved", offsetDays: 4,  customerIdx: 7, ref: "INV-1007", itemsCount: 2 }),
];

export const PAYMENTS: Transaction[] = [
  makeTx({ docType: "payment", index: 1, status: "cleared", approvalStatus: "approved", offsetDays: 3,  customerIdx: 0, ref: "INV-1001", itemsCount: 1, extra: { paymentMode: "NEFT",    paidAgainst: "INV-1001", paymentAmount: 118000, paymentDate: daysAgo(3) } }),
  makeTx({ docType: "payment", index: 2, status: "cleared", approvalStatus: "approved", offsetDays: 5,  customerIdx: 1, ref: "INV-1002", itemsCount: 1, extra: { paymentMode: "RTGS",    paidAgainst: "INV-1002", paymentAmount: 54200,  paymentDate: daysAgo(5) } }),
  makeTx({ docType: "payment", index: 3, status: "pending", approvalStatus: "pending",  offsetDays: 1,  customerIdx: 2, ref: "INV-1003", itemsCount: 1, extra: { paymentMode: "Cheque",  paidAgainst: "INV-1003", paymentAmount: 87500,  paymentDate: daysAgo(1) } }),
  makeTx({ docType: "payment", index: 4, status: "cleared", approvalStatus: "approved", offsetDays: 9,  customerIdx: 6, ref: "INV-1006", itemsCount: 1, extra: { paymentMode: "UPI",     paidAgainst: "INV-1006", paymentAmount: 22400,  paymentDate: daysAgo(9) } }),
  makeTx({ docType: "payment", index: 5, status: "cleared", approvalStatus: "approved", offsetDays: 12, customerIdx: 7, ref: "INV-1007", itemsCount: 1, extra: { paymentMode: "NEFT",    paidAgainst: "INV-1007", paymentAmount: 189000, paymentDate: daysAgo(12) } }),
];

export const ALL_TX: Transaction[] = [
  ...QUOTATIONS,
  ...SALES_ORDERS,
  ...DELIVERY_NOTES,
  ...INVOICES,
  ...RETURNS,
  ...PAYMENTS,
];