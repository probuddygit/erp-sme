import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileStack, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WORKFLOW_TEMPLATES, templateNodes } from "@/features/workflow/data";
import { useFlows } from "@/features/workflow/workflow-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspace/workflow/templates")({
  component: Page,
});

function Page() {
  const { rows, create } = useFlows();
  const navigate = useNavigate();

  const use = async (name: string, nodeCount: number) => {
    const id = crypto.randomUUID();
    await create({
      name: `${name} (copy)`,
      status: "Draft",
      nodes: templateNodes(name, nodeCount),
      updated_at: new Date().toISOString(),
    } as any);
    toast.success("Workflow created from template");
    const created = rows.find((r) => r.name === `${name} (copy)`);
    navigate({ to: "/workspace/workflow/designer", search: { flow: created?.id ?? id } });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">Templates</div>
        <div className="text-xs text-muted-foreground">Start from a pre-built workflow and customize to your process.</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {WORKFLOW_TEMPLATES.map((t) => (
          <div key={t.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileStack className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>
            </div>
            <div className="mt-4 text-sm font-semibold">{t.name}</div>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">{t.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground">{t.nodes} nodes</div>
              <Button size="sm" variant="secondary" onClick={() => use(t.name, t.nodes)}>
                <Sparkles className="mr-1 h-3.5 w-3.5" />Use template
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
