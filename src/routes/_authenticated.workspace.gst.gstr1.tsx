import { createFileRoute } from "@tanstack/react-router";
import { GstrPage } from "@/features/gst/components/GstrPage";

export const Route = createFileRoute("/_authenticated/workspace/gst/gstr1")({
  component: () => (
    <GstrPage
      title="GSTR-1"
      kind="GSTR1"
      description="Outward supplies — invoice-level filing due by 11th of the following month. Figures are computed live from the GST ledger."
    />
  ),
});
