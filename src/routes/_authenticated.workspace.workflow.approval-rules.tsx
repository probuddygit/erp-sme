import { createFileRoute } from "@tanstack/react-router";
import { Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APPROVAL_RULES } from "@/features/workflow/data";

export const Route = createFileRoute("/_authenticated/workspace/workflow/approval-rules")({
  component: Page,
});

function Page() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Approval rules</div>
          <div className="text-xs text-muted-foreground">Route documents to approvers based on conditions and thresholds.</div>
        </div>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />New rule</Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Rule</th>
              <th className="px-4 py-3 text-left">Document</th>
              <th className="px-4 py-3 text-left">Condition</th>
              <th className="px-4 py-3 text-left">Approvers</th>
              <th className="px-4 py-3 text-center">Levels</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {APPROVAL_RULES.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{r.document}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.condition}</td>
                <td className="px-4 py-3">{r.approvers}</td>
                <td className="px-4 py-3 text-center">{r.levels}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.status === "Active" ? "default" : "secondary"}>{r.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}