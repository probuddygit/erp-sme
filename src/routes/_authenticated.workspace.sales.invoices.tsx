import { createFileRoute } from "@tanstack/react-router";
import { ReceiptText } from "lucide-react";
import { TransactionsPage } from "@/features/sales/components/TransactionsPage";
import { INVOICES, formatDate } from "@/features/sales/data";

export const Route = createFileRoute("/_authenticated/workspace/sales/invoices")({
  component: () => (
    <TransactionsPage
      title="Invoices"
      description="GST-compliant tax invoices with itemised taxes, approvals and receivable tracking."
      icon={ReceiptText}
      data={INVOICES}
      statuses={["draft", "unpaid", "partial", "paid", "overdue"]}
      extraColumns={[
        {
          header: "Due",
          render: (t) => (t.dueDate ? formatDate(t.dueDate) : "—"),
        },
      ]}
    />
  ),
});