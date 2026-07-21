import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { EmptyModule } from "@/shared/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/workspace/sales")({
  component: () => (
    <div>
      <PageHeader
        title="Sales"
        description="Quotations, sales orders, and invoicing."
        breadcrumbs={[{ label: "Workspace" }, { label: "Sales" }]}
      />
      <EmptyModule
        icon={ShoppingCart}
        title="Sales Management"
        description="From quote to cash — manage the full order-to-invoice cycle for your trading business."
        features={["Quotations", "Sales orders", "Delivery notes", "Tax invoices", "Returns & credit notes"]}
      />
    </div>
  ),
});