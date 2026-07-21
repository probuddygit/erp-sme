import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MasterDataTable } from "@/features/masters/MasterDataTable";
import { getMaster } from "@/features/masters/registry";

export const Route = createFileRoute("/_authenticated/workspace/masters/$master")({
  component: MasterPage,
});

function MasterPage() {
  const { master: key } = useParams({ from: "/_authenticated/workspace/masters/$master" });
  const master = getMaster(key);

  if (!master) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="text-sm text-muted-foreground mb-4">Unknown master: {key}</div>
        <Button asChild variant="outline" size="sm">
          <Link to="/workspace/masters"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to masters</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{master.label}</h2>
        <p className="text-sm text-muted-foreground">{master.description}</p>
      </div>
      <MasterDataTable master={master} />
    </div>
  );
}