import { createFileRoute } from "@tanstack/react-router";
import { HandCoins } from "lucide-react";
import { EntriesPage } from "@/features/finance/components/EntriesPage";
import { useFinanceBook } from "@/features/finance/api";

export const Route = createFileRoute("/_authenticated/workspace/finance/receipts")({
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const book = useFinanceBook();
  return (
    <EntriesPage
      title="Receipts"
      description="Customer collections posted automatically when a Sales payment is recorded."
      icon={HandCoins}
      entryType="receipt"
      data={book.byType("receipt")}
      loading={book.isLoading}
      showParty
    />
  );
}
