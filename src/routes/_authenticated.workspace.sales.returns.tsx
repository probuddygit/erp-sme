import { createFileRoute } from "@tanstack/react-router";
import { Undo2 } from "lucide-react";
import { TransactionsPage } from "@/features/sales/components/TransactionsPage";
import { RETURNS } from "@/features/sales/data";

export const Route = createFileRoute("/_authenticated/workspace/sales/returns")({
  component: () => (
    <TransactionsPage
      title="Sales Returns"
      description="Customer returns with credit-note workflow, approvals and restocking updates."
      icon={Undo2}
      data={RETURNS}
      statuses={["pending", "received", "refunded", "rejected"]}
      extraColumns={[
        {
          header: "Against Invoice",
          render: (t) => t.reference ?? "—",
        },
      ]}
    />
  ),
});