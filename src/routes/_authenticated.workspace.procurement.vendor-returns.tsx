import { createFileRoute } from "@tanstack/react-router";
import { Undo2 } from "lucide-react";
import { PurchasesPage } from "@/features/procurement/components/PurchasesPage";
import { VENDOR_RETURNS } from "@/features/procurement/data";

export const Route = createFileRoute("/_authenticated/workspace/procurement/vendor-returns")({
  component: () => (
    <PurchasesPage
      title="Vendor Returns"
      description="Return of received goods to vendors — captures reason, GRN reference and refund/debit-note status."
      icon={Undo2}
      data={VENDOR_RETURNS}
      statuses={["pending", "dispatched", "refunded", "rejected"]}
      extraColumns={[
        { header: "Reason", render: (t) => t.reason ?? "—" },
      ]}
    />
  ),
});