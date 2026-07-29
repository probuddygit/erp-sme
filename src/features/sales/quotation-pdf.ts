import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { computeLine, inr, type TaxType } from "@/lib/sales-utils";

export interface QuotationPdfInput {
  quotationId: string;
  companyId: string;
}

async function loadQuotation(id: string) {
  const { data, error } = await supabase
    .from("quotations")
    .select("*, customer:customers(name,billing_address,gst_number,state_code,email,phone), items:quotation_items(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as any;
}

async function loadCompany(id: string) {
  const { data } = await supabase.from("companies").select("*").eq("id", id).single();
  return (data ?? {}) as any;
}

export async function buildQuotationPdf({ quotationId, companyId }: QuotationPdfInput) {
  const [q, company] = await Promise.all([loadQuotation(quotationId), loadCompany(companyId)]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(company.name ?? "Company", margin, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const addr = [company.address_line1, company.address_line2, company.city, company.state, company.pincode]
    .filter(Boolean).join(", ");
  if (addr) doc.text(addr, margin, 66, { maxWidth: pageW / 2 });
  if (company.gstin) doc.text(`GSTIN: ${company.gstin}`, margin, 92);
  if (company.email) doc.text(`Email: ${company.email}`, margin, 106);
  if (company.phone) doc.text(`Phone: ${company.phone}`, margin, 120);

  // Title block right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("QUOTATION", pageW - margin, 50, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`No: ${q.quotation_number}`, pageW - margin, 68, { align: "right" });
  doc.text(`Date: ${q.issue_date}`, pageW - margin, 82, { align: "right" });
  if (q.valid_until) doc.text(`Valid until: ${q.valid_until}`, pageW - margin, 96, { align: "right" });
  doc.text(`Status: ${String(q.status).toUpperCase()}`, pageW - margin, 110, { align: "right" });

  // Bill To
  const yBill = 150;
  doc.setDrawColor(220);
  doc.line(margin, yBill - 12, pageW - margin, yBill - 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Bill To", margin, yBill);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const cust = q.customer ?? {};
  const custLines = [
    cust.name,
    cust.billing_address,
    cust.gst_number ? `GSTIN: ${cust.gst_number}` : null,
    [cust.email, cust.phone].filter(Boolean).join(" · "),
  ].filter(Boolean) as string[];
  doc.text(custLines, margin, yBill + 14, { maxWidth: pageW / 2 - margin });

  // Line items
  const tax = q.tax_type as TaxType;
  const body = (q.items ?? [])
    .sort((a: any, b: any) => a.position - b.position)
    .map((l: any) => {
      const c = computeLine(l, tax);
      return [
        l.product_name + (l.description ? `\n${l.description}` : ""),
        String(l.quantity),
        inr(l.unit_price),
        `${Number(l.discount_percent ?? 0)}%`,
        `${Number(l.tax_percent ?? 0)}%`,
        inr(c.line_total),
      ];
    });

  autoTable(doc, {
    startY: yBill + 90,
    head: [["Item", "Qty", "Rate", "Disc", "GST", "Amount"]],
    body,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 40 },
      2: { halign: "right", cellWidth: 70 },
      3: { halign: "right", cellWidth: 45 },
      4: { halign: "right", cellWidth: 45 },
      5: { halign: "right", cellWidth: 80 },
    },
    margin: { left: margin, right: margin },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 16;
  const rightX = pageW - margin;
  const labelX = pageW - margin - 130;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const line = (label: string, val: string, y: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, labelX, y);
    doc.text(val, rightX, y, { align: "right" });
  };
  line("Subtotal", inr(q.subtotal), finalY);
  line("Discount", `- ${inr(q.discount_total)}`, finalY + 14);
  line(tax === "inter_state" ? "IGST" : tax === "intra_state" ? "CGST+SGST" : "Tax", inr(q.tax_total), finalY + 28);
  doc.setDrawColor(200);
  doc.line(labelX, finalY + 36, rightX, finalY + 36);
  line("Grand Total", inr(q.grand_total), finalY + 52, true);

  if (q.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Notes", margin, finalY + 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(String(q.notes), margin, finalY + 40, { maxWidth: pageW / 2 });
  }

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("This is a system-generated quotation.", margin, ph - 24);
  doc.text(`Generated ${new Date().toLocaleString("en-IN")}`, pageW - margin, ph - 24, { align: "right" });

  return { doc, quotation: q, company };
}

export async function downloadQuotationPdf(input: QuotationPdfInput) {
  const { doc, quotation } = await buildQuotationPdf(input);
  doc.save(`${quotation.quotation_number}.pdf`);
}

export async function openQuotationPdf(input: QuotationPdfInput, action: "preview" | "print" = "preview") {
  const { doc } = await buildQuotationPdf(input);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  if (action === "print") {
    // Use a hidden iframe to avoid popup blockers
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = url;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch { /* noop */ }
    };
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 60_000);
  } else {
    // Preview: use anchor click (not blocked by popup blockers)
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export async function shareQuotationPdf(input: QuotationPdfInput) {
  const { doc, quotation, company } = await buildQuotationPdf(input);
  const blob = doc.output("blob");
  const file = new File([blob], `${quotation.quotation_number}.pdf`, { type: "application/pdf" });
  const nav = navigator as any;
  if (nav.canShare?.({ files: [file] })) {
    await nav.share({
      files: [file],
      title: `Quotation ${quotation.quotation_number}`,
      text: `Quotation ${quotation.quotation_number} from ${company.name ?? ""}`,
    });
    return "shared" as const;
  }
  // Fallback: download
  doc.save(`${quotation.quotation_number}.pdf`);
  return "downloaded" as const;
}

export function sendQuotationEmail(quotation: { quotation_number: string; grand_total: number }, to?: string | null) {
  const subject = encodeURIComponent(`Quotation ${quotation.quotation_number}`);
  const body = encodeURIComponent(
    `Dear Customer,\n\nPlease find attached quotation ${quotation.quotation_number} for ${inr(quotation.grand_total)}.\n\nRegards,`,
  );
  const href = `mailto:${to ?? ""}?subject=${subject}&body=${body}`;
  window.location.href = href;
}