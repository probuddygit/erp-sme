import { createFileRoute } from "@tanstack/react-router";
import { Plus, GitBranch, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CONDITIONAL_RULES } from "@/features/workflow/data";

export const Route = createFileRoute("/_authenticated/workspace/workflow/conditional")({
  component: Page,
});

function Page() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Conditional rules</div>
          <div className="text-xs text-muted-foreground">If-this-then-that automations that fire on data events.</div>
        </div>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />New rule</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {CONDITIONAL_RULES.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">{r.id}</div>
                </div>
              </div>
              <Badge variant={r.status === "Active" ? "default" : "secondary"}>{r.status}</Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div className="rounded-md border border-border bg-muted/40 p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">When</div>
                <div className="mt-1 font-mono">{r.when}</div>
              </div>
              <div className="flex justify-center text-muted-foreground"><ArrowRight className="h-3 w-3" /></div>
              <div className="rounded-md border border-border bg-muted/40 p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Then</div>
                <div className="mt-1 font-mono">{r.then}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}