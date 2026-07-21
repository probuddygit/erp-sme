import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { EmptyModule } from "@/shared/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/workspace/finance")({
  component: () => (
    <div>
      <PageHeader
        title="Finance & Accounting"
        description="Ledger, receivables, payables, and reconciliation."
        breadcrumbs={[{ label: "Workspace" }, { label: "Finance" }]}
      />
      <EmptyModule
        icon={Wallet}
        title="Finance & Accounting"
        description="Double-entry ledger, AR/AP ageing, bank reconciliation and financial statements."
        features={["Chart of accounts", "Journal entries", "AR & AP", "Bank reconciliation", "P&L, Balance Sheet"]}
      />
    </div>
  ),
});