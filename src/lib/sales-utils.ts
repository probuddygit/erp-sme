import type { Database } from "@/integrations/supabase/types";

export type TaxType = Database["public"]["Enums"]["tax_type"];

export interface LineInput {
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
}

export interface LineComputed extends LineInput {
  gross: number;
  discount_amount: number;
  taxable: number;
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  line_total: number;
}

export function computeLine(line: LineInput, tax_type: TaxType): LineComputed {
  const gross = (line.quantity || 0) * (line.unit_price || 0);
  const discount_amount = gross * ((line.discount_percent || 0) / 100);
  const taxable = gross - discount_amount;
  const tax_amount = taxable * ((line.tax_percent || 0) / 100);
  let cgst = 0,
    sgst = 0,
    igst = 0;
  if (tax_type === "intra_state") {
    cgst = tax_amount / 2;
    sgst = tax_amount / 2;
  } else if (tax_type === "inter_state") {
    igst = tax_amount;
  }
  return {
    ...line,
    gross,
    discount_amount,
    taxable,
    tax_amount,
    cgst_amount: round2(cgst),
    sgst_amount: round2(sgst),
    igst_amount: round2(igst),
    line_total: round2(taxable + tax_amount),
  };
}

export interface Totals {
  subtotal: number;
  discount_total: number;
  tax_total: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  grand_total: number;
}

export function computeTotals(lines: LineInput[], tax_type: TaxType): Totals {
  const computed = lines.map((l) => computeLine(l, tax_type));
  const subtotal = computed.reduce((s, l) => s + l.gross, 0);
  const discount_total = computed.reduce((s, l) => s + l.discount_amount, 0);
  const tax_total = computed.reduce((s, l) => s + l.tax_amount, 0);
  const cgst_total = computed.reduce((s, l) => s + l.cgst_amount, 0);
  const sgst_total = computed.reduce((s, l) => s + l.sgst_amount, 0);
  const igst_total = computed.reduce((s, l) => s + l.igst_amount, 0);
  const grand_total = computed.reduce((s, l) => s + l.line_total, 0);
  return {
    subtotal: round2(subtotal),
    discount_total: round2(discount_total),
    tax_total: round2(tax_total),
    cgst_total: round2(cgst_total),
    sgst_total: round2(sgst_total),
    igst_total: round2(igst_total),
    grand_total: round2(grand_total),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function inr(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);
}

export const LEAD_STAGES: { key: Database["public"]["Enums"]["lead_status"]; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];
