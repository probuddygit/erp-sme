import { createFileRoute } from "@tanstack/react-router";
import { GstrPage } from "@/features/gst/components/GstrPage";
import { GSTR3B_PERIODS } from "@/features/gst/data";

export const Route = createFileRoute("/_authenticated/workspace/gst/gstr3b")({
  component: () => (
    <GstrPage
      title="GSTR-3B"
      kind="GSTR3B"
      description="Summary return with self-assessed tax liability — due by 20th of the following month."
      data={GSTR3B_PERIODS}
    />
  ),
});
