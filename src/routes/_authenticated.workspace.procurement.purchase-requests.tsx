import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { PurchasesPage } from "@/features/procurement/components/PurchasesPage";
import { PURCHASE_REQUESTS, formatDate } from "@/features/procurement/data";

export const Route = createFileRoute("/_authenticated/workspace/procurement/purchase-requests")({
  component: () => (
    <PurchasesPage
      title="Purchase Requests"
      description="Internal requests raised by departments for procurement approval before an RFQ is issued."
      icon={ClipboardList}
      data={PURCHASE_REQUESTS}
      statuses={["draft", "submitted", "approved", "rejected"]}
      extraColumns={[
        { header: "Required By", render: (t) => (t.requiredBy ? formatDate(t.requiredBy) : "—") },
      ]}
    />
  ),
});