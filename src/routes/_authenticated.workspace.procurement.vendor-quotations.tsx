import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PurchasesPage } from "@/features/procurement/components/PurchasesPage";
import { VENDOR_QUOTATIONS, formatDate } from "@/features/procurement/data";

export const Route = createFileRoute("/_authenticated/workspace/procurement/vendor-quotations")({
  component: () => (
    <PurchasesPage
      title="Vendor Quotations"
      description="Quotations received from vendors in response to RFQs, with comparison and acceptance workflow."
      icon={FileText}
      data={VENDOR_QUOTATIONS}
      statuses={["received", "accepted", "rejected", "expired"]}
      extraColumns={[
        { header: "Valid Until", render: (t) => (t.validUntil ? formatDate(t.validUntil) : "—") },
      ]}
    />
  ),
});