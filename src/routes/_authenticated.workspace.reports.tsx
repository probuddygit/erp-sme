import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageHeader } from "@/shared/components/PageHeader";
import { ReportsSidebar } from "@/features/reports/components/ReportsSidebar";
import { AIInsightsFab } from "@/features/reports/components/AIInsightsPanel";

export const Route = createFileRoute("/_authenticated/workspace/reports")({
  component: ReportsLayout,
});

function ReportsLayout() {
  return (
    <div>
      <PageHeader
        title="Reports & Business Intelligence"
        description="Prebuilt reports, dashboards, custom BI and AI-driven insights across every module."
        breadcrumbs={[{ label: "Workspace" }, { label: "Reports" }]}
      />
      <div className="flex flex-col gap-6 md:flex-row">
        <ReportsSidebar />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
      <AIInsightsFab />
    </div>
  );
}