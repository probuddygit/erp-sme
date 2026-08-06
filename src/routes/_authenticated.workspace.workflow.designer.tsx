import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { WorkflowDesigner } from "@/features/workflow/components/WorkflowDesigner";

export const Route = createFileRoute("/_authenticated/workspace/workflow/designer")({
  validateSearch: z.object({ flow: z.string().optional() }),
  component: DesignerPage,
});

function DesignerPage() {
  const { flow } = Route.useSearch();
  return <WorkflowDesigner flowId={flow} />;
}
