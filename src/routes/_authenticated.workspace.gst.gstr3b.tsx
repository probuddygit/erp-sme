import { createFileRoute } from "@tanstack/react-router";
import { GstrPage } from "@/features/gst/components/GstrPage";

export const Route = createFileRoute("/_authenticated/workspace/gst/gstr3b")({
  component: () => (
    <GstrPage
      title="GSTR-3B"
      kind="GSTR3B"
      description="Summary return with self-assessed tax liability and input tax credit — due by 20th of the following month."
    />
  ),
});
