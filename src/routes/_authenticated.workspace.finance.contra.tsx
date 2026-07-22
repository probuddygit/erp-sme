import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight } from "lucide-react";
import { EntriesPage } from "@/features/finance/components/EntriesPage";
import { CONTRA_ENTRIES } from "@/features/finance/data";

export const Route = createFileRoute("/_authenticated/workspace/finance/contra")({
  component: () => (
    <EntriesPage
      title="Contra"
      description="Cash-to-bank, bank-to-bank and cash withdrawal movements."
      icon={ArrowLeftRight}
      data={CONTRA_ENTRIES}
    />
  ),
});