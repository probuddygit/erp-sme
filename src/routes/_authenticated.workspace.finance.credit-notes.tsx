import { createFileRoute } from "@tanstack/react-router";
import { FileMinus } from "lucide-react";
import { EntriesPage } from "@/features/finance/components/EntriesPage";
import { CREDIT_NOTES } from "@/features/finance/data";

export const Route = createFileRoute("/_authenticated/workspace/finance/credit-notes")({
  component: () => (
    <EntriesPage
      title="Credit Notes"
      description="Sales returns, rate reductions and post-sale adjustments issued to customers."
      icon={FileMinus}
      data={CREDIT_NOTES}
      showParty
    />
  ),
});