import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { EntriesPage } from "@/features/finance/components/EntriesPage";
import { useFinanceBook } from "@/features/finance/api";

export const Route = createFileRoute("/_authenticated/workspace/finance/journal-entries")({
  component: JournalEntriesPage,
});

function JournalEntriesPage() {
  const book = useFinanceBook();
  return (
    <EntriesPage
      title="Journal Entries"
      description="Every ledger posting — auto-generated from Sales, Procurement, Inventory, Production and Payroll documents, plus manual adjustments."
      icon={BookOpen}
      entryType="journal"
      data={book.entries}
      loading={book.isLoading}
      showParty
    />
  );
}