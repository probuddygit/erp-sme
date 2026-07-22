import { createFileRoute } from "@tanstack/react-router";
import { HandCoins } from "lucide-react";
import { EntriesPage } from "@/features/finance/components/EntriesPage";
import { RECEIPTS } from "@/features/finance/data";

export const Route = createFileRoute("/_authenticated/workspace/finance/receipts")({
  component: () => (
    <EntriesPage
      title="Receipts"
      description="Customer receipts and other collections deposited to cash or bank."
      icon={HandCoins}
      data={RECEIPTS}
      showParty
      showMode
    />
  ),
});