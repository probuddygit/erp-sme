export interface HsnCode {
  id: string;
  code: string;
  description: string;
  chapter: string;
  gstRate: number;
  type: "goods" | "service";
  uom: string;
}

export interface GstRate {
  id: string;
  name: string;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess?: number;
  effectiveFrom: string;
  active: boolean;
}

export interface TaxRule {
  id: string;
  name: string;
  scope: "sales" | "purchase" | "both";
  supplyType: "intra-state" | "inter-state" | "export" | "sez";
  hsnPattern: string;
  rateId: string;
  priority: number;
  active: boolean;
}

export interface EInvoiceRow {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyer: string;
  buyerGstin: string;
  totalValue: number;
  irn?: string;
  ackNo?: string;
  ackDate?: string;
  status: "pending" | "generated" | "cancelled" | "failed";
}

export interface EWayBillRow {
  id: string;
  invoiceNumber: string;
  ewbNo?: string;
  fromPin: string;
  toPin: string;
  distanceKm: number;
  vehicleNo: string;
  transporter: string;
  totalValue: number;
  generatedAt?: string;
  validUpto?: string;
  status: "pending" | "active" | "cancelled" | "expired";
}

export interface GstrPeriod {
  id: string;
  period: string; // MMM-YYYY
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  invoices: number;
  status: "draft" | "submitted" | "filed" | "overdue";
  filedAt?: string;
  arn?: string;
  dueDate: string;
}

export const HSN_CODES: HsnCode[] = [
  { id: "h1", code: "7208", description: "Flat-rolled products of iron / non-alloy steel", chapter: "72", gstRate: 18, type: "goods", uom: "KGS" },
  { id: "h2", code: "8471", description: "Automatic data processing machines", chapter: "84", gstRate: 18, type: "goods", uom: "NOS" },
  { id: "h3", code: "1006", description: "Rice", chapter: "10", gstRate: 5, type: "goods", uom: "KGS" },
  { id: "h4", code: "3004", description: "Medicaments for therapeutic use", chapter: "30", gstRate: 12, type: "goods", uom: "NOS" },
  { id: "h5", code: "8703", description: "Motor cars & other motor vehicles", chapter: "87", gstRate: 28, type: "goods", uom: "NOS" },
  { id: "h6", code: "9983", description: "Other professional, technical & business services", chapter: "99", gstRate: 18, type: "service", uom: "NA" },
  { id: "h7", code: "9954", description: "Construction services", chapter: "99", gstRate: 12, type: "service", uom: "NA" },
  { id: "h8", code: "0401", description: "Milk & cream, not concentrated", chapter: "04", gstRate: 0, type: "goods", uom: "LTR" },
  { id: "h9", code: "2402", description: "Cigars, cigarettes, tobacco products", chapter: "24", gstRate: 28, type: "goods", uom: "NOS" },
  { id: "h10", code: "9971", description: "Financial & related services", chapter: "99", gstRate: 18, type: "service", uom: "NA" },
];

export const GST_RATES: GstRate[] = [
  { id: "r0",  name: "GST 0%  (NIL)",    rate: 0,  cgst: 0,   sgst: 0,   igst: 0,  effectiveFrom: "2017-07-01", active: true },
  { id: "r5",  name: "GST 5%",           rate: 5,  cgst: 2.5, sgst: 2.5, igst: 5,  effectiveFrom: "2017-07-01", active: true },
  { id: "r12", name: "GST 12%",          rate: 12, cgst: 6,   sgst: 6,   igst: 12, effectiveFrom: "2017-07-01", active: true },
  { id: "r18", name: "GST 18%",          rate: 18, cgst: 9,   sgst: 9,   igst: 18, effectiveFrom: "2017-07-01", active: true },
  { id: "r28", name: "GST 28%",          rate: 28, cgst: 14,  sgst: 14,  igst: 28, effectiveFrom: "2017-07-01", active: true },
  { id: "r28c",name: "GST 28% + Cess",   rate: 28, cgst: 14,  sgst: 14,  igst: 28, cess: 15, effectiveFrom: "2017-07-01", active: true },
];

export const TAX_RULES: TaxRule[] = [
  { id: "t1", name: "Intra-state sale of steel", scope: "sales",    supplyType: "intra-state", hsnPattern: "7208*", rateId: "r18", priority: 10, active: true },
  { id: "t2", name: "Inter-state sale of steel", scope: "sales",    supplyType: "inter-state", hsnPattern: "7208*", rateId: "r18", priority: 10, active: true },
  { id: "t3", name: "Export (Zero-rated)",       scope: "sales",    supplyType: "export",      hsnPattern: "*",     rateId: "r0",  priority: 5,  active: true },
  { id: "t4", name: "Local service provisions",  scope: "sales",    supplyType: "intra-state", hsnPattern: "99*",   rateId: "r18", priority: 20, active: true },
  { id: "t5", name: "Purchase — raw material",   scope: "purchase", supplyType: "intra-state", hsnPattern: "7208*", rateId: "r18", priority: 10, active: true },
  { id: "t6", name: "Automobile — luxury cess",  scope: "sales",    supplyType: "intra-state", hsnPattern: "8703*", rateId: "r28c",priority: 15, active: true },
];

export const EINVOICES: EInvoiceRow[] = [
  { id: "e1", invoiceNumber: "INV/2026/0142", invoiceDate: "2026-07-18", buyer: "Ashok Industries",  buyerGstin: "29ABCDE1234F1Z5", totalValue: 245800, irn: "IRN9K3F2A8B7C6D5E4", ackNo: "112510098765", ackDate: "2026-07-18T10:22:00Z", status: "generated" },
  { id: "e2", invoiceNumber: "INV/2026/0143", invoiceDate: "2026-07-19", buyer: "Bharat Enterprises", buyerGstin: "27XYZDE9876F1Z5", totalValue: 118200, irn: "IRN8H2E1D5B3A9C7F2", ackNo: "112510098823", ackDate: "2026-07-19T14:05:00Z", status: "generated" },
  { id: "e3", invoiceNumber: "INV/2026/0144", invoiceDate: "2026-07-20", buyer: "Kirloskar Traders", buyerGstin: "24PQRDE5555F1Z5", totalValue: 89400,  status: "pending" },
  { id: "e4", invoiceNumber: "INV/2026/0145", invoiceDate: "2026-07-21", buyer: "Sundaram & Co.",   buyerGstin: "33LMNDE4444F1Z5", totalValue: 542000, status: "failed" },
  { id: "e5", invoiceNumber: "INV/2026/0138", invoiceDate: "2026-07-10", buyer: "Reliance Metals",  buyerGstin: "27ZZZDE1111F1Z5", totalValue: 65400,  irn: "IRN7A2B9F1D8E4C3B6A", ackNo: "112510097654", ackDate: "2026-07-10T09:30:00Z", status: "cancelled" },
];

export const EWAYBILLS: EWayBillRow[] = [
  { id: "w1", invoiceNumber: "INV/2026/0142", ewbNo: "EWB1234567890", fromPin: "560001", toPin: "400001", distanceKm: 980, vehicleNo: "KA01AB1234", transporter: "VRL Logistics",  totalValue: 245800, generatedAt: "2026-07-18T11:00:00Z", validUpto: "2026-07-24T11:00:00Z", status: "active" },
  { id: "w2", invoiceNumber: "INV/2026/0143", ewbNo: "EWB1234567891", fromPin: "560068", toPin: "500001", distanceKm: 570, vehicleNo: "KA02CD5678", transporter: "TCI Express",   totalValue: 118200, generatedAt: "2026-07-19T15:20:00Z", validUpto: "2026-07-23T15:20:00Z", status: "active" },
  { id: "w3", invoiceNumber: "INV/2026/0144",                        fromPin: "560002", toPin: "600001", distanceKm: 340, vehicleNo: "KA03EF9012", transporter: "Safexpress",     totalValue: 89400,  status: "pending" },
  { id: "w4", invoiceNumber: "INV/2026/0139", ewbNo: "EWB1234567870", fromPin: "560001", toPin: "700001", distanceKm: 1870, vehicleNo: "KA04GH3456", transporter: "BlueDart",     totalValue: 312800, generatedAt: "2026-06-28T10:00:00Z", validUpto: "2026-07-08T10:00:00Z", status: "expired" },
  { id: "w5", invoiceNumber: "INV/2026/0135", ewbNo: "EWB1234567855", fromPin: "560001", toPin: "110001", distanceKm: 2150, vehicleNo: "KA05IJ7890", transporter: "Gati Logistics",totalValue: 428000, generatedAt: "2026-06-15T08:00:00Z", validUpto: "2026-06-27T08:00:00Z", status: "cancelled" },
];

export const GSTR1_PERIODS: GstrPeriod[] = [
  { id: "g1a", period: "Jul-2026", taxableValue: 12480000, cgst: 620000, sgst: 620000, igst: 480000, cess: 15000, invoices: 218, status: "draft",     dueDate: "2026-08-11" },
  { id: "g1b", period: "Jun-2026", taxableValue: 11250000, cgst: 580000, sgst: 580000, igst: 420000, cess: 12000, invoices: 196, status: "filed",     filedAt: "2026-07-09", arn: "AA290725123456", dueDate: "2026-07-11" },
  { id: "g1c", period: "May-2026", taxableValue: 10820000, cgst: 540000, sgst: 540000, igst: 398000, cess: 10500, invoices: 189, status: "filed",     filedAt: "2026-06-08", arn: "AA290625987654", dueDate: "2026-06-11" },
  { id: "g1d", period: "Apr-2026", taxableValue: 9720000,  cgst: 486000, sgst: 486000, igst: 320000, cess: 8000,  invoices: 172, status: "filed",     filedAt: "2026-05-10", arn: "AA290525445566", dueDate: "2026-05-11" },
];

export const GSTR3B_PERIODS: GstrPeriod[] = [
  { id: "b1a", period: "Jul-2026", taxableValue: 12480000, cgst: 620000, sgst: 620000, igst: 480000, cess: 15000, invoices: 218, status: "draft",     dueDate: "2026-08-20" },
  { id: "b1b", period: "Jun-2026", taxableValue: 11250000, cgst: 580000, sgst: 580000, igst: 420000, cess: 12000, invoices: 196, status: "filed",     filedAt: "2026-07-19", arn: "AB290725112233", dueDate: "2026-07-20" },
  { id: "b1c", period: "May-2026", taxableValue: 10820000, cgst: 540000, sgst: 540000, igst: 398000, cess: 10500, invoices: 189, status: "filed",     filedAt: "2026-06-18", arn: "AB290625998877", dueDate: "2026-06-20" },
  { id: "b1d", period: "Apr-2026", taxableValue: 9720000,  cgst: 486000, sgst: 486000, igst: 320000, cess: 8000,  invoices: 172, status: "filed",     filedAt: "2026-05-19", arn: "AB290525665544", dueDate: "2026-05-20" },
];

export const STATUS_TONES: Record<string, "emerald" | "amber" | "sky" | "rose" | "slate"> = {
  filed: "emerald",
  generated: "emerald",
  active: "emerald",
  submitted: "sky",
  draft: "slate",
  pending: "amber",
  overdue: "rose",
  cancelled: "rose",
  failed: "rose",
  expired: "slate",
};

export function formatINR(n: number, compact = true): string {
  if (compact) {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ---- Dashboard aggregates ----
export function gstDashboardTotals() {
  const outputTax = GSTR1_PERIODS[0].cgst + GSTR1_PERIODS[0].sgst + GSTR1_PERIODS[0].igst;
  const inputTax = Math.round(outputTax * 0.62);
  const netPayable = outputTax - inputTax;
  return { outputTax, inputTax, netPayable, invoices: GSTR1_PERIODS[0].invoices };
}

export function gstTrend() {
  return GSTR1_PERIODS.slice().reverse().map((p) => ({
    period: p.period.split("-")[0],
    output: p.cgst + p.sgst + p.igst,
    input: Math.round((p.cgst + p.sgst + p.igst) * (0.55 + Math.random() * 0.15)),
  }));
}