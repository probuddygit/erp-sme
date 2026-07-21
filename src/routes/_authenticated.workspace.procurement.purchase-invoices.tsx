import { createFileRoute } from "@tanstack/react-router";
import { ReceiptText } from "lucide-react";
import { PurchasesPage } from "@/features/procurement/components/PurchasesPage";
import { PURCHASE_INVOICES, formatDate } from "@/features/procurement/data";

export const Route = createFileRoute("/_authenticated/workspace/procurement/purchase-invoices")({
  component: () => (
    <PurchasesPage
      title="Purchase Invoices"
      description="Vendor bills booked against GRNs — 3-way match with PO & GRN, GST breakup and payment status."
      icon={ReceiptText}
      data={PURCHASE_INVOICES}
      statuses={["draft", "unpaid", "partial", "paid", "overdue"]}
      extraColumns={[
        { header: "Due Date", render: (t) => (t.dueDate ? formatDate(t.dueDate) : "—") },
      ]}
    />
  ),
});