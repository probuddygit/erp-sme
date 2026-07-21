import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { PurchasesPage } from "@/features/procurement/components/PurchasesPage";
import { VENDOR_PAYMENTS, formatDate } from "@/features/procurement/data";

export const Route = createFileRoute("/_authenticated/workspace/procurement/vendor-payments")({
  component: () => (
    <PurchasesPage
      title="Vendor Payments"
      description="Outward payments issued to vendors — NEFT, RTGS, UPI, Cheque — with allocation to invoices."
      icon={Wallet}
      data={VENDOR_PAYMENTS}
      statuses={["pending", "cleared"]}
      extraColumns={[
        { header: "Mode", render: (t) => t.paymentMode ?? "—" },
        { header: "Paid Against", render: (t) => t.paidAgainst ?? "—" },
        { header: "Payment Date", render: (t) => (t.paymentDate ? formatDate(t.paymentDate) : "—") },
      ]}
    />
  ),
});