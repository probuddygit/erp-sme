import { createFileRoute } from "@tanstack/react-router";
import { Users2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { EmptyModule } from "@/shared/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/workspace/crm")({
  component: () => (
    <div>
      <PageHeader
        title="CRM"
        description="Leads, contacts, and customer relationships."
        breadcrumbs={[{ label: "Workspace" }, { label: "CRM" }]}
      />
      <EmptyModule
        icon={Users2}
        title="Customer Relationship Management"
        description="Capture leads, qualify opportunities, and nurture customers through a unified pipeline."
        features={["Lead capture & scoring", "Contact & account 360", "Sales pipeline", "Activity timeline"]}
      />
    </div>
  ),
});