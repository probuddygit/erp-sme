import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { EmptyModule } from "@/shared/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/workspace/reports")({
  component: () => (
    <div>
      <PageHeader
        title="Reports"
        description="Analytics and business intelligence."
        breadcrumbs={[{ label: "Workspace" }, { label: "Reports" }]}
      />
      <EmptyModule
        icon={BarChart3}
        title="Reports & Analytics"
        description="Prebuilt operational reports plus custom BI dashboards across every module."
        features={["Sales analytics", "Inventory ageing", "Financial statements", "Custom dashboards"]}
      />
    </div>
  ),
});