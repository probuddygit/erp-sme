import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { TransactionsPage } from "@/features/sales/components/TransactionsPage";
import { PAYMENTS } from "@/features/sales/data";

export const Route = createFileRoute("/_authenticated/workspace/sales/payments")({
  component: () => (
    <TransactionsPage
      title="Customer Payments"
      description="Money received from customers — NEFT, RTGS, UPI, cheque — mapped to invoices."
      icon={Wallet}
      data={PAYMENTS}
      statuses={["pending", "cleared"]}
      extraColumns={[
        {
          header: "Mode",
          render: (t) => t.paymentMode ?? "—",
        },
        {
          header: "Against",
          render: (t) => t.paidAgainst ?? "—",
        },
      ]}
    />
  ),
});