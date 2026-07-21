import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { EmptyModule } from "@/shared/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/workspace/procurement")({
  component: () => (
    <div>
      <PageHeader
        title="Procurement"
        description="Vendors, purchase orders, and goods receipts."
        breadcrumbs={[{ label: "Workspace" }, { label: "Procurement" }]}
      />
      <EmptyModule
        icon={Truck}
        title="Procurement"
        description="Manage vendors, raise indents, negotiate RFQs, and close the loop with 3-way match."
        features={["Vendors", "Purchase indents", "RFQs & PO", "Goods receipts", "Vendor invoices"]}
      />
    </div>
  ),
});