import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight } from "lucide-react";
import { EntriesPage } from "@/features/finance/components/EntriesPage";
import { useFinanceBook } from "@/features/finance/api";

export const Route = createFileRoute("/_authenticated/workspace/finance/contra")({
  component: ContraPage,
});

function ContraPage() {
  const book = useFinanceBook();
  return (
    <EntriesPage
      title="Contra"
      description="Cash-to-bank, bank-to-bank and cash withdrawal movements."
      icon={ArrowLeftRight}
      entryType="contra"
      data={book.byType("contra")}
      loading={book.isLoading}
    />
  );
}
