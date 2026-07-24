import { createFileRoute } from "@tanstack/react-router";
import { WorkflowDesigner } from "@/features/workflow/components/WorkflowDesigner";

export const Route = createFileRoute("/_authenticated/workspace/workflow/designer")({
  component: WorkflowDesigner,
});