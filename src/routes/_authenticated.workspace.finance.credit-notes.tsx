import { createFileRoute } from "@tanstack/react-router";
import { FileMinus } from "lucide-react";
import { EntriesPage } from "@/features/finance/components/EntriesPage";
import { useFinanceBook } from "@/features/finance/api";

export const Route = createFileRoute("/_authenticated/workspace/finance/credit-notes")({
  component: CreditNotesPage,
});

function CreditNotesPage() {
  const book = useFinanceBook();
  return (
    <EntriesPage
      title="Credit Notes"
      description="Sales returns and post-sale adjustments reversed into the ledger from the Sales module."
      icon={FileMinus}
      entryType="credit_note"
      data={book.byType("credit_note")}
      loading={book.isLoading}
      showParty
    />
  );
}
