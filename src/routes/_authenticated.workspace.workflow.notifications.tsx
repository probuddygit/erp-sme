import { createFileRoute } from "@tanstack/react-router";
import { Plus, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { NOTIFICATION_RULES } from "@/features/workflow/data";

export const Route = createFileRoute("/_authenticated/workspace/workflow/notifications")({
  component: Page,
});

function Page() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Notification rules</div>
          <div className="text-xs text-muted-foreground">Deliver alerts across in-app, email, SMS and push channels.</div>
        </div>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />New rule</Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Event</th>
              <th className="px-4 py-3 text-left">Channels</th>
              <th className="px-4 py-3 text-left">Audience</th>
              <th className="px-4 py-3 text-left">Template</th>
              <th className="px-4 py-3 text-right">Enabled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {NOTIFICATION_RULES.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-rose-600" />
                    <div>
                      <div className="font-medium">{r.event}</div>
                      <div className="text-xs text-muted-foreground">{r.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.channels.map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{r.audience}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.template}</td>
                <td className="px-4 py-3 text-right"><Switch defaultChecked={r.enabled} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}