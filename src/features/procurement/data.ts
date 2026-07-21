// Dummy data for the Procurement module. In-memory, no backend.

export type PurchaseDocType =
  | "purchase_request"
  | "rfq"
  | "vendor_quotation"
  | "purchase_order"
  | "grn"
  | "purchase_invoice"
  | "vendor_payment"
  | "vendor_return";

export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

export interface Attachment {
  id: string; name: string; size: string; uploadedAt: string; uploadedBy: string;
}
export interface Comment { id: string; author: string; createdAt: string; body: string; }
export interface TimelineEvent { id: string; label: string; when: string; actor?: string; }
export interface AuditEntry {
  id: string; when: string; actor: string; action: string;
  field?: string; from?: string; to?: string;
}

export interface LineItem {
  id: string; code: string; description: string; hsn: string;
  qty: number; uom: string; rate: number; discountPct: number;
  taxRate: number; amount: number;
}

export interface TaxRow { id: string; label: string; rate: number; amount: number; }

export interface PurchaseTx {
  id: string;
  docType: PurchaseDocType;
  number: string;
  date: string;
  status: string;
  approvalStatus: ApprovalStatus;
  approver?: string;

  vendor: string;
  vendorCode: string;
  gstin?: string;
  billingAddress: string;
  shippingAddress: string;

  reference?: string;
  requiredBy?: string;
  validUntil?: string;
  expectedDate?: string;
  receivedDate?: string;
  dueDate?: string;
  paymentDate?: string;
  paymentMode?: string;
  paymentAmount?: number;
  paidAgainst?: string;
  reason?: string;
  warehouse?: string;

  buyer: string;
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

export const DOC_META: Record<PurchaseDocType, { label: string; short: string; prefix: string }> = {
  purchase_request: { label: "Purchase Request",  short: "Request",  prefix: "PR" },
  rfq:              { label: "Request for Quote", short: "RFQ",      prefix: "RFQ" },
  vendor_quotation: { label: "Vendor Quotation",  short: "Quote",    prefix: "VQ" },
  purchase_order:   { label: "Purchase Order",    short: "PO",       prefix: "PO" },
  grn:              { label: "Goods Receipt",     short: "GRN",      prefix: "GRN" },
  purchase_invoice: { label: "Purchase Invoice",  short: "Bill",     prefix: "PINV" },
  vendor_payment:   { label: "Vendor Payment",    short: "Payment",  prefix: "PAY" },
  vendor_return:    { label: "Vendor Return",     short: "Return",   prefix: "PR-RET" },
};

export const STATUS_TONES: Record<string, string> = {
  draft:        "bg-slate-100 text-slate-700 border-slate-200",
  submitted:    "bg-blue-50 text-blue-700 border-blue-200",
  sent:         "bg-blue-50 text-blue-700 border-blue-200",
  received:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  responded:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  awaiting:     "bg-amber-50 text-amber-800 border-amber-200",
  accepted:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:     "bg-rose-50 text-rose-700 border-rose-200",
  expired:      "bg-amber-50 text-amber-800 border-amber-200",
  confirmed:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial:      "bg-amber-50 text-amber-800 border-amber-200",
  fulfilled:    "bg-violet-50 text-violet-700 border-violet-200",
  cancelled:    "bg-rose-50 text-rose-700 border-rose-200",
  in_transit:   "bg-amber-50 text-amber-800 border-amber-200",
  inspected:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  unpaid:       "bg-rose-50 text-rose-700 border-rose-200",
  overdue:      "bg-rose-50 text-rose-700 border-rose-200",
  approved:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:      "bg-amber-50 text-amber-800 border-amber-200",
  refunded:     "bg-blue-50 text-blue-700 border-blue-200",
  cleared:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  dispatched:   "bg-blue-50 text-blue-700 border-blue-200",
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

const VENDORS = [
  { code: "VN-301", name: "Tata Steel Traders",     gstin: "27TATAS1234F1Z5", city: "Mumbai" },
  { code: "VN-302", name: "Bharat Fasteners Ltd",   gstin: "24BHARA9876P1Z2", city: "Ahmedabad" },
  { code: "VN-303", name: "Godrej Industrial",      gstin: "27GODRJ4567Q1Z9", city: "Pune" },
  { code: "VN-304", name: "Larsen Machinery Co",    gstin: "29LARSE5678R1Z1", city: "Bengaluru" },
  { code: "VN-305", name: "Hindalco Aluminium",     gstin: "07HINDL2345S1Z7", city: "Delhi" },
  { code: "VN-306", name: "Reliance Polymers",      gstin: "24RELIA3456T1Z4", city: "Vadodara" },
  { code: "VN-307", name: "SKF Bearings India",     gstin: "27SKFIN6789U1Z3", city: "Pune" },
  { code: "VN-308", name: "Castrol Lubricants",     gstin: "27CASTL7890V1Z8", city: "Mumbai" },
];

const CATALOG = [
  { code: "RM-100", desc: "MS Angle 50x50x5mm — 6m",          hsn: "7216", uom: "NOS",  rate: 1180,  gst: 18 },
  { code: "RM-101", desc: "Hex Bolt M12 x 60 (Zinc)",         hsn: "7318", uom: "BOX",  rate: 420,   gst: 18 },
  { code: "RM-102", desc: "Copper Wire 2.5 sqmm (90m coil)",  hsn: "8544", uom: "COIL", rate: 3050,  gst: 18 },
  { code: "RM-103", desc: "Ball Bearing 6205 ZZ",             hsn: "8482", uom: "NOS",  rate: 580,   gst: 18 },
  { code: "RM-104", desc: "Hydraulic Oil ISO 68 (210L drum)", hsn: "2710", uom: "DRUM", rate: 17800, gst: 18 },
  { code: "RM-105", desc: "SS 304 Sheet 2mm (1.25 x 2.5m)",   hsn: "7219", uom: "SHT",  rate: 8600,  gst: 18 },
  { code: "RM-106", desc: "PVC Conduit 25mm x 3m",            hsn: "3917", uom: "NOS",  rate: 195,   gst: 18 },
  { code: "RM-107", desc: "Safety Helmet — ISI (Yellow)",     hsn: "6506", uom: "NOS",  rate: 340,   gst: 12 },
];

const BUYERS = ["Anil Kumar", "Meera Iyer", "Kiran Rao", "Sanjay Gupta", "Nisha Pillai"];
const WAREHOUSES = ["WH-Chennai-Main", "WH-Pune-Central", "WH-Mumbai-Port", "WH-Delhi-Depot"];

const rnd = (seed: number) => { let x = seed; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; };
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  d.setHours(9 + (n % 8), (n * 7) % 60, 0, 0);
  return d.toISOString();
};

function buildItems(seed: number, n: number) {
  const r = rnd(seed);
  const items: LineItem[] = [];
  for (let i = 0; i < n; i++) {
    const c = CATALOG[Math.floor(r() * CATALOG.length)];
    const qty = 1 + Math.floor(r() * 25);
    const discountPct = Math.floor(r() * 4) * 2;
    const gross = qty * c.rate;
    const amount = Math.round(gross * (1 - discountPct / 100));
    items.push({
      id: `LI-${seed}-${i}`, code: c.code, description: c.desc, hsn: c.hsn,
      qty, uom: c.uom, rate: c.rate, discountPct, taxRate: c.gst, amount,
    });
  }
  const subTotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const discountTotal = items.reduce((s, i) => s + (i.qty * i.rate - i.amount), 0);
  const netTotal = subTotal - discountTotal;
  const buckets: Record<number, number> = {};
  items.forEach((it) => {
    buckets[it.taxRate] = (buckets[it.taxRate] ?? 0) + Math.round(it.amount * (it.taxRate / 100));
  });
  const taxes: TaxRow[] = [];
  Object.entries(buckets).forEach(([rate, amt]) => {
    const half = Math.round(amt / 2);
    taxes.push({ id: `t-c-${rate}`, label: `CGST @ ${Number(rate) / 2}%`, rate: Number(rate) / 2, amount: half });
    taxes.push({ id: `t-s-${rate}`, label: `SGST @ ${Number(rate) / 2}%`, rate: Number(rate) / 2, amount: amt - half });
  });
  const taxTotal = taxes.reduce((s, t) => s + t.amount, 0);
  const raw = netTotal + taxTotal;
  const rounded = Math.round(raw);
  return { items, taxes, subTotal, discountTotal, taxTotal, roundOff: rounded - raw, grandTotal: rounded };
}

function defaultTimeline(t: {
  docType: PurchaseDocType; createdAt: string; approvalStatus: ApprovalStatus;
  approver?: string; status: string;
}): TimelineEvent[] {
  const evs: TimelineEvent[] = [
    { id: "tl-1", label: `${DOC_META[t.docType].label} created`, when: t.createdAt, actor: "System" },
  ];
  if (t.approvalStatus !== "draft") evs.push({ id: "tl-2", label: "Sent for approval", when: daysAgo(3), actor: "You" });
  if (t.approvalStatus === "approved") evs.push({ id: "tl-3", label: `Approved by ${t.approver ?? "Manager"}`, when: daysAgo(2), actor: t.approver });
  if (t.approvalStatus === "rejected") evs.push({ id: "tl-3", label: `Rejected by ${t.approver ?? "Manager"}`, when: daysAgo(2), actor: t.approver });
  if (["received", "inspected", "paid", "confirmed", "dispatched", "cleared"].includes(t.status))
    evs.push({ id: "tl-4", label: `Status changed to ${t.status}`, when: daysAgo(1), actor: "System" });
  return evs;
}

function defaultAudit(seed: number): AuditEntry[] {
  return [
    { id: `au-${seed}-1`, when: daysAgo(6), actor: "Anil Kumar", action: "Created record" },
    { id: `au-${seed}-2`, when: daysAgo(5), actor: "Anil Kumar", action: "Updated field", field: "Notes", from: "—", to: "Priority procurement" },
    { id: `au-${seed}-3`, when: daysAgo(4), actor: "Meera Iyer", action: "Added line item", field: "Items", to: "RM-104 × 3" },
    { id: `au-${seed}-4`, when: daysAgo(3), actor: "Kiran Rao",  action: "Submitted for approval" },
  ];
}

function defaultComments(seed: number): Comment[] {
  const pool = [
    "Vendor quoted 5% better rate than last order — recommend acceptance.",
    "Please confirm delivery lead time before issuing PO.",
    "GST breakup verified. Ready for approval.",
    "Awaiting warehouse capacity confirmation.",
    "Vendor requested advance — flagged to Finance.",
  ];
  const r = rnd(seed + 42);
  const n = 1 + Math.floor(r() * 3);
  return Array.from({ length: n }).map((_, i) => ({
    id: `cm-${seed}-${i}`, author: BUYERS[Math.floor(r() * BUYERS.length)],
    createdAt: daysAgo(i + 1), body: pool[Math.floor(r() * pool.length)],
  }));
}

function defaultAttachments(seed: number): Attachment[] {
  const files = [
    { name: "vendor-quote.pdf",   size: "212 KB" },
    { name: "material-spec.pdf",  size: "540 KB" },
    { name: "rate-comparison.xlsx", size: "64 KB" },
    { name: "delivery-challan.pdf", size: "188 KB" },
  ];
  const r = rnd(seed + 7);
  const n = 1 + Math.floor(r() * 3);
  return Array.from({ length: n }).map((_, i) => ({
    id: `at-${seed}-${i}`, name: files[i % files.length].name,
    size: files[i % files.length].size, uploadedAt: daysAgo(i + 2),
    uploadedBy: BUYERS[i % BUYERS.length],
  }));
}

interface Seed {
  docType: PurchaseDocType;
  index: number;
  status: string;
  approvalStatus: ApprovalStatus;
  offsetDays: number;
  vendorIdx: number;
  itemsCount?: number;
  ref?: string;
  extra?: Partial<PurchaseTx>;
}

let uid = 1;
function makeTx(s: Seed): PurchaseTx {
  const meta = DOC_META[s.docType];
  const v = VENDORS[s.vendorIdx % VENDORS.length];
  const buyer = BUYERS[s.index % BUYERS.length];
  const seed = uid++ * 31 + s.index;
  const totals = buildItems(seed, s.itemsCount ?? 2 + (s.index % 3));
  const createdAt = daysAgo(s.offsetDays);
  const number = `${meta.prefix}-${String(1000 + s.index).padStart(4, "0")}`;
  const address = `${v.name}\nPlot ${100 + s.index}, Industrial Estate\n${v.city}, India`;

  const tx: PurchaseTx = {
    id: `${meta.prefix}-${seed}`,
    docType: s.docType,
    number, date: createdAt, status: s.status, approvalStatus: s.approvalStatus,
    approver: s.approvalStatus === "approved" || s.approvalStatus === "rejected" ? "Rajesh Menon" : undefined,
    vendor: v.name, vendorCode: v.code, gstin: v.gstin,
    billingAddress: address, shippingAddress: address,
    reference: s.ref, buyer, currency: "INR",
    warehouse: WAREHOUSES[s.index % WAREHOUSES.length],
    ...totals,
    notes: "Delivery to be scheduled during weekday business hours.",
    terms: "Payment 45 days from invoice date. Goods subject to inspection at receipt.",
    attachments: defaultAttachments(seed),
    comments: defaultComments(seed),
    timeline: [], audit: defaultAudit(seed),
    ...s.extra,
  };
  tx.timeline = defaultTimeline({
    docType: tx.docType, createdAt, approvalStatus: tx.approvalStatus,
    approver: tx.approver, status: tx.status,
  });
  return tx;
}

// ---------- Seed datasets ----------------------------------------------

export const PURCHASE_REQUESTS: PurchaseTx[] = [
  makeTx({ docType: "purchase_request", index: 1, status: "submitted", approvalStatus: "pending",  offsetDays: 2,  vendorIdx: 0, extra: { requiredBy: daysAgo(-14) } }),
  makeTx({ docType: "purchase_request", index: 2, status: "approved",  approvalStatus: "approved", offsetDays: 5,  vendorIdx: 1, extra: { requiredBy: daysAgo(-10) } }),
  makeTx({ docType: "purchase_request", index: 3, status: "draft",     approvalStatus: "draft",    offsetDays: 1,  vendorIdx: 2 }),
  makeTx({ docType: "purchase_request", index: 4, status: "rejected",  approvalStatus: "rejected", offsetDays: 8,  vendorIdx: 3, extra: { requiredBy: daysAgo(-5) } }),
  makeTx({ docType: "purchase_request", index: 5, status: "approved",  approvalStatus: "approved", offsetDays: 12, vendorIdx: 4, extra: { requiredBy: daysAgo(-2) } }),
  makeTx({ docType: "purchase_request", index: 6, status: "submitted", approvalStatus: "pending",  offsetDays: 3,  vendorIdx: 6, extra: { requiredBy: daysAgo(-20) } }),
];

export const RFQS: PurchaseTx[] = [
  makeTx({ docType: "rfq", index: 1, status: "sent",      approvalStatus: "approved", offsetDays: 4,  vendorIdx: 0, ref: "PR-1001", extra: { validUntil: daysAgo(-10) } }),
  makeTx({ docType: "rfq", index: 2, status: "responded", approvalStatus: "approved", offsetDays: 9,  vendorIdx: 1, ref: "PR-1002", extra: { validUntil: daysAgo(-6)  } }),
  makeTx({ docType: "rfq", index: 3, status: "awaiting",  approvalStatus: "approved", offsetDays: 3,  vendorIdx: 4, ref: "PR-1005", extra: { validUntil: daysAgo(-12) } }),
  makeTx({ docType: "rfq", index: 4, status: "draft",     approvalStatus: "draft",    offsetDays: 0,  vendorIdx: 5 }),
  makeTx({ docType: "rfq", index: 5, status: "sent",      approvalStatus: "pending",  offsetDays: 2,  vendorIdx: 6, ref: "PR-1006", extra: { validUntil: daysAgo(-15) } }),
  makeTx({ docType: "rfq", index: 6, status: "expired",   approvalStatus: "approved", offsetDays: 30, vendorIdx: 7, extra: { validUntil: daysAgo(5) } }),
];

export const VENDOR_QUOTATIONS: PurchaseTx[] = [
  makeTx({ docType: "vendor_quotation", index: 1, status: "received",  approvalStatus: "pending",  offsetDays: 3,  vendorIdx: 0, ref: "RFQ-1001", extra: { validUntil: daysAgo(-20) } }),
  makeTx({ docType: "vendor_quotation", index: 2, status: "accepted",  approvalStatus: "approved", offsetDays: 7,  vendorIdx: 1, ref: "RFQ-1002", extra: { validUntil: daysAgo(-14) } }),
  makeTx({ docType: "vendor_quotation", index: 3, status: "rejected",  approvalStatus: "rejected", offsetDays: 10, vendorIdx: 3, ref: "RFQ-1003", extra: { validUntil: daysAgo(-3)  } }),
  makeTx({ docType: "vendor_quotation", index: 4, status: "received",  approvalStatus: "pending",  offsetDays: 1,  vendorIdx: 4, ref: "RFQ-1005", extra: { validUntil: daysAgo(-25) } }),
  makeTx({ docType: "vendor_quotation", index: 5, status: "accepted",  approvalStatus: "approved", offsetDays: 14, vendorIdx: 6, ref: "RFQ-1005" }),
  makeTx({ docType: "vendor_quotation", index: 6, status: "expired",   approvalStatus: "approved", offsetDays: 45, vendorIdx: 7, extra: { validUntil: daysAgo(10) } }),
];

export const PURCHASE_ORDERS: PurchaseTx[] = [
  makeTx({ docType: "purchase_order", index: 1, status: "confirmed",  approvalStatus: "approved", offsetDays: 10, vendorIdx: 0, ref: "VQ-1002", extra: { expectedDate: daysAgo(-5) } }),
  makeTx({ docType: "purchase_order", index: 2, status: "partial",    approvalStatus: "approved", offsetDays: 15, vendorIdx: 1, ref: "VQ-1002", extra: { expectedDate: daysAgo(-2) } }),
  makeTx({ docType: "purchase_order", index: 3, status: "fulfilled",  approvalStatus: "approved", offsetDays: 25, vendorIdx: 6, ref: "VQ-1005", extra: { expectedDate: daysAgo(5) } }),
  makeTx({ docType: "purchase_order", index: 4, status: "draft",      approvalStatus: "draft",    offsetDays: 1,  vendorIdx: 2 }),
  makeTx({ docType: "purchase_order", index: 5, status: "cancelled",  approvalStatus: "rejected", offsetDays: 18, vendorIdx: 3 }),
  makeTx({ docType: "purchase_order", index: 6, status: "confirmed",  approvalStatus: "pending",  offsetDays: 4,  vendorIdx: 4, extra: { expectedDate: daysAgo(-12) } }),
  makeTx({ docType: "purchase_order", index: 7, status: "sent",       approvalStatus: "approved", offsetDays: 6,  vendorIdx: 5, extra: { expectedDate: daysAgo(-8) } }),
];

export const GRNS: PurchaseTx[] = [
  makeTx({ docType: "grn", index: 1, status: "received",  approvalStatus: "approved", offsetDays: 4,  vendorIdx: 0, ref: "PO-1001", extra: { receivedDate: daysAgo(4) } }),
  makeTx({ docType: "grn", index: 2, status: "inspected", approvalStatus: "approved", offsetDays: 2,  vendorIdx: 1, ref: "PO-1002", extra: { receivedDate: daysAgo(2) } }),
  makeTx({ docType: "grn", index: 3, status: "partial",   approvalStatus: "approved", offsetDays: 1,  vendorIdx: 6, ref: "PO-1003", extra: { receivedDate: daysAgo(1) } }),
  makeTx({ docType: "grn", index: 4, status: "draft",     approvalStatus: "draft",    offsetDays: 0,  vendorIdx: 4 }),
  makeTx({ docType: "grn", index: 5, status: "received",  approvalStatus: "approved", offsetDays: 12, vendorIdx: 5, ref: "PO-1007", extra: { receivedDate: daysAgo(12) } }),
  makeTx({ docType: "grn", index: 6, status: "rejected",  approvalStatus: "rejected", offsetDays: 6,  vendorIdx: 7, ref: "PO-1006", extra: { receivedDate: daysAgo(6), reason: "Quality inspection failed" } }),
];

export const PURCHASE_INVOICES: PurchaseTx[] = [
  makeTx({ docType: "purchase_invoice", index: 1, status: "paid",    approvalStatus: "approved", offsetDays: 25, vendorIdx: 0, ref: "GRN-1001", extra: { dueDate: daysAgo(-5)  } }),
  makeTx({ docType: "purchase_invoice", index: 2, status: "partial", approvalStatus: "approved", offsetDays: 18, vendorIdx: 1, ref: "GRN-1002", extra: { dueDate: daysAgo(-10) } }),
  makeTx({ docType: "purchase_invoice", index: 3, status: "unpaid",  approvalStatus: "approved", offsetDays: 8,  vendorIdx: 2, ref: "GRN-1003", extra: { dueDate: daysAgo(-30) } }),
  makeTx({ docType: "purchase_invoice", index: 4, status: "overdue", approvalStatus: "approved", offsetDays: 55, vendorIdx: 4, ref: "GRN-1005", extra: { dueDate: daysAgo(10) } }),
  makeTx({ docType: "purchase_invoice", index: 5, status: "draft",   approvalStatus: "draft",    offsetDays: 1,  vendorIdx: 5 }),
  makeTx({ docType: "purchase_invoice", index: 6, status: "unpaid",  approvalStatus: "pending",  offsetDays: 3,  vendorIdx: 6, ref: "GRN-1006", extra: { dueDate: daysAgo(-40) } }),
  makeTx({ docType: "purchase_invoice", index: 7, status: "paid",    approvalStatus: "approved", offsetDays: 40, vendorIdx: 7, ref: "GRN-1004", extra: { dueDate: daysAgo(5) } }),
];

export const VENDOR_PAYMENTS: PurchaseTx[] = [
  makeTx({ docType: "vendor_payment", index: 1, status: "cleared", approvalStatus: "approved", offsetDays: 3,  vendorIdx: 0, ref: "PINV-1001", itemsCount: 1, extra: { paymentMode: "NEFT",   paidAgainst: "PINV-1001", paymentAmount: 128000, paymentDate: daysAgo(3)  } }),
  makeTx({ docType: "vendor_payment", index: 2, status: "cleared", approvalStatus: "approved", offsetDays: 6,  vendorIdx: 1, ref: "PINV-1002", itemsCount: 1, extra: { paymentMode: "RTGS",   paidAgainst: "PINV-1002", paymentAmount: 64200,  paymentDate: daysAgo(6)  } }),
  makeTx({ docType: "vendor_payment", index: 3, status: "pending", approvalStatus: "pending",  offsetDays: 1,  vendorIdx: 2, ref: "PINV-1003", itemsCount: 1, extra: { paymentMode: "Cheque", paidAgainst: "PINV-1003", paymentAmount: 92500,  paymentDate: daysAgo(1)  } }),
  makeTx({ docType: "vendor_payment", index: 4, status: "cleared", approvalStatus: "approved", offsetDays: 9,  vendorIdx: 6, ref: "PINV-1006", itemsCount: 1, extra: { paymentMode: "UPI",    paidAgainst: "PINV-1006", paymentAmount: 24400,  paymentDate: daysAgo(9)  } }),
  makeTx({ docType: "vendor_payment", index: 5, status: "cleared", approvalStatus: "approved", offsetDays: 12, vendorIdx: 7, ref: "PINV-1007", itemsCount: 1, extra: { paymentMode: "NEFT",   paidAgainst: "PINV-1007", paymentAmount: 198000, paymentDate: daysAgo(12) } }),
];

export const VENDOR_RETURNS: PurchaseTx[] = [
  makeTx({ docType: "vendor_return", index: 1, status: "dispatched", approvalStatus: "approved", offsetDays: 5,  vendorIdx: 0, ref: "GRN-1001", itemsCount: 1, extra: { reason: "Damaged in transit" } }),
  makeTx({ docType: "vendor_return", index: 2, status: "refunded",   approvalStatus: "approved", offsetDays: 14, vendorIdx: 4, ref: "GRN-1005", itemsCount: 2, extra: { reason: "Wrong specification" } }),
  makeTx({ docType: "vendor_return", index: 3, status: "pending",    approvalStatus: "pending",  offsetDays: 2,  vendorIdx: 2, ref: "GRN-1003", itemsCount: 1, extra: { reason: "Quantity mismatch" } }),
  makeTx({ docType: "vendor_return", index: 4, status: "rejected",   approvalStatus: "rejected", offsetDays: 10, vendorIdx: 5, ref: "GRN-1007", itemsCount: 1, extra: { reason: "Beyond return window" } }),
  makeTx({ docType: "vendor_return", index: 5, status: "dispatched", approvalStatus: "approved", offsetDays: 4,  vendorIdx: 7, ref: "GRN-1002", itemsCount: 2, extra: { reason: "Quality failure" } }),
];

export const ALL_PURCHASE_TX: PurchaseTx[] = [
  ...PURCHASE_REQUESTS, ...RFQS, ...VENDOR_QUOTATIONS, ...PURCHASE_ORDERS,
  ...GRNS, ...PURCHASE_INVOICES, ...VENDOR_PAYMENTS, ...VENDOR_RETURNS,
];