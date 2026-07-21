import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { EmptyModule } from "@/shared/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/workspace/inventory")({
  component: () => (
    <div>
      <PageHeader
        title="Inventory"
        description="Items, warehouses, and stock movements."
        breadcrumbs={[{ label: "Workspace" }, { label: "Inventory" }]}
      />
      <EmptyModule
        icon={Boxes}
        title="Inventory & Warehousing"
        description="Multi-warehouse stock control with batch, expiry, and reorder-level tracking."
        features={["Item master", "Warehouses & bins", "Stock movements", "Reorder alerts", "Stock valuation"]}
      />
    </div>
  ),
});