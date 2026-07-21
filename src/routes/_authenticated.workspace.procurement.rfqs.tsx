import { createFileRoute } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";
import { PurchasesPage } from "@/features/procurement/components/PurchasesPage";
import { RFQS, formatDate } from "@/features/procurement/data";

export const Route = createFileRoute("/_authenticated/workspace/procurement/rfqs")({
  component: () => (
    <PurchasesPage
      title="RFQs"
      description="Requests for Quotation issued to vendors, with response tracking and validity windows."
      icon={FileQuestion}
      data={RFQS}
      statuses={["draft", "sent", "awaiting", "responded", "expired"]}
      extraColumns={[
        { header: "Valid Until", render: (t) => (t.validUntil ? formatDate(t.validUntil) : "—") },
      ]}
    />
  ),
});