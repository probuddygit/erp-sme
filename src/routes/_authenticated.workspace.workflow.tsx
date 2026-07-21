import { createFileRoute } from "@tanstack/react-router";
import { GitBranch } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { EmptyModule } from "@/shared/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/workspace/workflow")({
  component: () => (
    <div>
      <PageHeader
        title="Workflow"
        description="Approvals, automations, and audit trails."
        breadcrumbs={[{ label: "Workspace" }, { label: "Workflow" }]}
      />
      <EmptyModule
        icon={GitBranch}
        title="Workflow Engine"
        description="Design multi-step approval flows, automations and complete audit trails across modules."
        features={["Approval rules", "Multi-step routing", "Automations", "Audit log"]}
      />
    </div>
  ),
});