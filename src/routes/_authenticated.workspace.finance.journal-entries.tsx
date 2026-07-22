import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { EntriesPage } from "@/features/finance/components/EntriesPage";
import { JOURNAL_ENTRIES } from "@/features/finance/data";

export const Route = createFileRoute("/_authenticated/workspace/finance/journal-entries")({
  component: () => (
    <EntriesPage
      title="Journal Entries"
      description="Manual double-entry adjustments — accruals, provisions, depreciation and reclassifications."
      icon={BookOpen}
      data={JOURNAL_ENTRIES}
    />
  ),
});