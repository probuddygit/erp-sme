import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { EmptyModule } from "@/shared/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/workspace/gst")({
  component: () => (
    <div>
      <PageHeader
        title="GST"
        description="Returns, e-invoicing and compliance."
        breadcrumbs={[{ label: "Workspace" }, { label: "GST" }]}
      />
      <EmptyModule
        icon={Receipt}
        title="GST Compliance"
        description="India-first GST engine — from e-invoice IRN generation to GSTR filing."
        features={["GSTR-1 & 3B", "E-invoice / IRN", "E-way bill", "Input credit reconciliation"]}
      />
    </div>
  ),
});