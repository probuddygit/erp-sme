import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { EntriesPage } from "@/features/finance/components/EntriesPage";
import { PAYMENTS } from "@/features/finance/data";

export const Route = createFileRoute("/_authenticated/workspace/finance/payments")({
  component: () => (
    <EntriesPage
      title="Payments"
      description="Vendor and statutory payments made from cash or bank."
      icon={Wallet}
      data={PAYMENTS}
      showParty
      showMode
    />
  ),
});