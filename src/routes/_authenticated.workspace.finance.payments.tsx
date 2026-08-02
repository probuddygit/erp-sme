import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { EntriesPage } from "@/features/finance/components/EntriesPage";
import { useFinanceBook } from "@/features/finance/api";

export const Route = createFileRoute("/_authenticated/workspace/finance/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const book = useFinanceBook();
  return (
    <EntriesPage
      title="Payments"
      description="Vendor, payroll and statutory payments posted from Procurement and HR."
      icon={Wallet}
      entryType="payment"
      data={book.byType("payment")}
      loading={book.isLoading}
      showParty
    />
  );
}