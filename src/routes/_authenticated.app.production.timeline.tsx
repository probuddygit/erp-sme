import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarRange } from "lucide-react";
import { StatusBadge } from "./_authenticated.app.production.index";

export const Route = createFileRoute("/_authenticated/app/production/timeline")({
  component: TimelinePage,
});

interface WO {
  id: string;
  wo_number: string;
  product_name: string;
  status: string;
  planned_quantity: number;
  produced_quantity: number;
  unit: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
}

function TimelinePage() {
  const { company } = useAuth();

  const { data: wos } = useQuery({
    enabled: !!company?.id,
    queryKey: ["wo-timeline", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("id, wo_number, product_name, status, planned_quantity, produced_quantity, unit, scheduled_start, scheduled_end")
        .eq("company_id", company!.id)
        .not("scheduled_start", "is", null)
        .order("scheduled_start", { ascending: true });
      if (error) throw error;
      return data as WO[];
    },
  });

  if (!wos || wos.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <CalendarRange className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No scheduled work orders yet.</p>
          <p className="text-xs mt-1">Set scheduled_start &amp; scheduled_end on a work order to see it on the timeline.</p>
        </CardContent>
      </Card>
    );
  }

  // compute date range
  const allDates = wos.flatMap((w) => [w.scheduled_start, w.scheduled_end].filter(Boolean) as string[]);
  const minDate = new Date(Math.min(...allDates.map((d) => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => new Date(d).getTime())));
  // pad
  minDate.setDate(minDate.getDate() - 1);
  maxDate.setDate(maxDate.getDate() + 1);
  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
  const days: Date[] = [];
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const STATUS_COLOR: Record<string, string> = {
    planned: "bg-muted-foreground/40",
    released: "bg-secondary-foreground/60",
    in_progress: "bg-accent",
    completed: "bg-emerald-500",
    cancelled: "bg-destructive/60",
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header */}
            <div className="flex border-b border-border bg-muted/30 sticky top-0">
              <div className="w-64 shrink-0 px-4 py-2 text-xs font-medium uppercase tracking-widest text-muted-foreground border-r border-border">
                Work order
              </div>
              <div className="flex-1 flex">
                {days.map((d, i) => (
                  <div key={i} className="flex-1 px-1 py-2 text-center text-[10px] text-muted-foreground border-r border-border/50 min-w-[28px]">
                    <div>{d.getDate()}</div>
                    <div className="opacity-60">{d.toLocaleDateString(undefined, { month: "short" })}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {wos.map((w) => {
              const start = w.scheduled_start ? new Date(w.scheduled_start) : null;
              const end = w.scheduled_end ? new Date(w.scheduled_end) : start;
              if (!start || !end) return null;
              const startOffset = Math.floor((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
              const span = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
              const pct = w.planned_quantity > 0 ? Math.min(100, (Number(w.produced_quantity) / Number(w.planned_quantity)) * 100) : 0;
              return (
                <div key={w.id} className="flex border-b border-border hover:bg-muted/20 transition-colors">
                  <Link
                    to="/app/production/work-orders/$id"
                    params={{ id: w.id }}
                    className="w-64 shrink-0 px-4 py-3 border-r border-border min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{w.wo_number}</span>
                      <StatusBadge status={w.status} />
                    </div>
                    <div className="font-medium text-sm truncate">{w.product_name}</div>
                    <div className="text-xs text-muted-foreground">{w.produced_quantity}/{w.planned_quantity} {w.unit}</div>
                  </Link>
                  <div className="flex-1 relative py-3">
                    <div className="absolute inset-0 flex">
                      {days.map((_, i) => (
                        <div key={i} className="flex-1 border-r border-border/30 min-w-[28px]" />
                      ))}
                    </div>
                    <div
                      className={`relative h-6 mt-1 rounded ${STATUS_COLOR[w.status] ?? "bg-muted-foreground/40"} overflow-hidden`}
                      style={{
                        marginLeft: `${(startOffset / (totalDays + 1)) * 100}%`,
                        width: `${(span / (totalDays + 1)) * 100}%`,
                      }}
                    >
                      <div className="absolute inset-y-0 left-0 bg-foreground/20" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}