import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { TransactionsPage } from "@/features/sales/components/TransactionsPage";
import { SALES_ORDERS, formatDate } from "@/features/sales/data";

export const Route = createFileRoute("/_authenticated/workspace/sales/sales-orders")({
  component: () => (
    <TransactionsPage
      title="Sales Orders"
      description="Confirmed customer orders ready for fulfillment. Track dispatch, approvals and pricing."
      icon={ClipboardList}
      data={SALES_ORDERS}
      statuses={["draft", "confirmed", "processing", "fulfilled", "cancelled"]}
      extraColumns={[
        {
          header: "Delivery",
          render: (t) => (t.deliveryDate ? formatDate(t.deliveryDate) : "—"),
        },
      ]}
    />
  ),
});