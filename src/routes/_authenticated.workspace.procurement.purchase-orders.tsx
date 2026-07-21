import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { PurchasesPage } from "@/features/procurement/components/PurchasesPage";
import { PURCHASE_ORDERS, formatDate } from "@/features/procurement/data";

export const Route = createFileRoute("/_authenticated/workspace/procurement/purchase-orders")({
  component: () => (
    <PurchasesPage
      title="Purchase Orders"
      description="Formal purchase orders issued to vendors with terms, expected delivery and approval trail."
      icon={ShoppingCart}
      data={PURCHASE_ORDERS}
      statuses={["draft", "sent", "confirmed", "partial", "fulfilled", "cancelled"]}
      extraColumns={[
        { header: "Expected", render: (t) => (t.expectedDate ? formatDate(t.expectedDate) : "—") },
      ]}
    />
  ),
});