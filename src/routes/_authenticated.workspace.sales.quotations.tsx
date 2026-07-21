import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { TransactionsPage } from "@/features/sales/components/TransactionsPage";
import { QUOTATIONS, formatDate } from "@/features/sales/data";

export const Route = createFileRoute("/_authenticated/workspace/sales/quotations")({
  component: () => (
    <TransactionsPage
      title="Quotations"
      description="Quotations are proposals shared with prospective customers, with tax breakup, approvals and terms."
      icon={FileText}
      data={QUOTATIONS}
      statuses={["draft", "sent", "accepted", "rejected", "expired"]}
      extraColumns={[
        {
          header: "Valid Until",
          render: (t) => (t.validUntil ? formatDate(t.validUntil) : "—"),
        },
      ]}
    />
  ),
});