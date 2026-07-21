import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { EmptyModule } from "@/shared/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/workspace/administration")({
  component: () => (
    <div>
      <PageHeader
        title="Administration"
        description="Companies, branches, users, roles and settings."
        breadcrumbs={[{ label: "Workspace" }, { label: "Administration" }]}
      />
      <EmptyModule
        icon={Settings}
        title="Administration"
        description="Tenant configuration — organizations, branches, financial years, users, roles and preferences."
        features={["Companies & branches", "Financial years", "Users & roles", "Permissions", "Preferences"]}
      />
    </div>
  ),
});