import { createFileRoute } from "@tanstack/react-router";
import { PackageCheck } from "lucide-react";
import { PurchasesPage } from "@/features/procurement/components/PurchasesPage";
import { GRNS, formatDate } from "@/features/procurement/data";

export const Route = createFileRoute("/_authenticated/workspace/procurement/grns")({
  component: () => (
    <PurchasesPage
      title="Goods Receipt Notes"
      description="Materials received against POs, with warehouse posting, inspection status and short-supply tracking."
      icon={PackageCheck}
      data={GRNS}
      statuses={["draft", "received", "partial", "inspected", "rejected"]}
      extraColumns={[
        { header: "Received", render: (t) => (t.receivedDate ? formatDate(t.receivedDate) : "—") },
        { header: "Warehouse", render: (t) => t.warehouse ?? "—" },
      ]}
    />
  ),
});