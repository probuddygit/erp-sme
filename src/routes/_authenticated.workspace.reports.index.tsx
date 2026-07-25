import { createFileRoute, Link } from "@tanstack/react-router";
import { REPORT_CATEGORIES, REPORTS, SAVED_REPORTS } from "@/features/reports/data";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronRight, TrendingUp, Wallet, Boxes, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/reports/")({
  component: ReportsOverview,
});

const KPIS = [
  { label: "Reports available", value: String(REPORTS.length), icon: TrendingUp, tone: "text-emerald-600 bg-emerald-500/10" },
  { label: "Categories",        value: "8", icon: Boxes, tone: "text-amber-600 bg-amber-500/10" },
  { label: "Saved & scheduled", value: String(SAVED_REPORTS.length), icon: Wallet, tone: "text-blue-600 bg-blue-500/10" },
  { label: "AI suggestions",    value: "8", icon: Sparkles, tone: "text-violet-600 bg-violet-500/10" },
];

function ReportsOverview() {
  const favourites = REPORTS.filter((r) => r.favourite);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", k.tone)}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight">{k.value}</div>
            </div>
          );
        })}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Favourites</h3>
          <Link to={"/workspace/reports/saved" as any} className="text-xs text-primary hover:underline">View all saved →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {favourites.map((r) => (
            <Link
              key={r.id}
              to={`/workspace/reports/${r.category}/${r.id}` as any}
              className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {r.name}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-60 group-hover:text-primary group-hover:opacity-100" />
              </div>
              <Badge variant="outline" className="mt-3 text-[10px] uppercase tracking-widest">{r.category}</Badge>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Explore report categories</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_CATEGORIES.map((c) => {
            const count = REPORTS.filter((r) => r.category === c.key).length;
            const Icon = c.icon;
            return (
              <Link
                key={c.key}
                to={`/workspace/reports/${c.key}` as any}
                className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-md"
              >
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", c.accent)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-semibold">{c.label}</div>
                <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{count > 0 ? `${count} reports` : "Tool"}</span>
                  <span className="text-primary opacity-0 transition group-hover:opacity-100">Open →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}