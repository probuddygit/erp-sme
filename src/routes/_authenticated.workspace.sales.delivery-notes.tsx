import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { TransactionsPage } from "@/features/sales/components/TransactionsPage";
import { DELIVERY_NOTES } from "@/features/sales/data";

export const Route = createFileRoute("/_authenticated/workspace/sales/delivery-notes")({
  component: () => (
    <TransactionsPage
      title="Delivery Notes"
      description="Goods shipped to customers with vehicle, transporter and receipt tracking."
      icon={Truck}
      data={DELIVERY_NOTES}
      statuses={["draft", "dispatched", "in_transit", "delivered", "cancelled"]}
      extraColumns={[
        {
          header: "Against SO",
          render: (t) => t.reference ?? "—",
        },
      ]}
    />
  ),
});