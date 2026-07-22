import { createFileRoute } from "@tanstack/react-router";
import { FilePlus } from "lucide-react";
import { EntriesPage } from "@/features/finance/components/EntriesPage";
import { DEBIT_NOTES } from "@/features/finance/data";

export const Route = createFileRoute("/_authenticated/workspace/finance/debit-notes")({
  component: () => (
    <EntriesPage
      title="Debit Notes"
      description="Purchase returns and vendor claims raised to suppliers."
      icon={FilePlus}
      data={DEBIT_NOTES}
      showParty
    />
  ),
});