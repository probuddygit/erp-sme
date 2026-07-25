import { createFileRoute, useParams } from "@tanstack/react-router";
import { ReportViewer } from "@/features/reports/components/ReportViewer";

export const Route = createFileRoute("/_authenticated/workspace/reports/$category/$reportId")({
  component: () => {
    const { reportId } = useParams({ from: "/_authenticated/workspace/reports/$category/$reportId" });
    return <ReportViewer reportId={reportId} />;
  },
});