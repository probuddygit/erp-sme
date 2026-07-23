import { createFileRoute } from "@tanstack/react-router";
import { GstrPage } from "@/features/gst/components/GstrPage";
import { GSTR1_PERIODS } from "@/features/gst/data";

export const Route = createFileRoute("/_authenticated/workspace/gst/gstr1")({
  component: () => (
    <GstrPage
      title="GSTR-1"
      kind="GSTR1"
      description="Outward supplies — invoice-level filing due by 11th of the following month."
      data={GSTR1_PERIODS}
    />
  ),
});
