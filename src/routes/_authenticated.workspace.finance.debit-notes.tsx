import { createFileRoute } from "@tanstack/react-router";
import { FilePlus } from "lucide-react";
import { EntriesPage } from "@/features/finance/components/EntriesPage";
import { useFinanceBook } from "@/features/finance/api";

export const Route = createFileRoute("/_authenticated/workspace/finance/debit-notes")({
  component: DebitNotesPage,
});

function DebitNotesPage() {
  const book = useFinanceBook();
  return (
    <EntriesPage
      title="Debit Notes"
      description="Vendor returns and supplier claims posted from the Procurement module."
      icon={FilePlus}
      entryType="debit_note"
      data={book.byType("debit_note")}
      loading={book.isLoading}
      showParty
    />
  );
}
