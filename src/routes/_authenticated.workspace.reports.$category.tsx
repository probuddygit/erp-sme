import { createFileRoute, Link, useParams, Outlet, useMatches } from "@tanstack/react-router";
import { REPORT_CATEGORIES, REPORTS, SAVED_REPORTS, AI_SUGGESTIONS } from "@/features/reports/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Search, Star, ChevronRight, Plus, CalendarClock, Mail, Sparkles, FolderOpen, Wrench } from "lucide-react";
import { ReportBuilder } from "@/features/reports/components/ReportBuilder";
import { AIInsightsPanel } from "@/features/reports/components/AIInsightsPanel";

export const Route = createFileRoute("/_authenticated/workspace/reports/$category")({
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = useParams({ from: "/_authenticated/workspace/reports/$category" });
  const matches = useMatches();
  const hasChild = matches.some((m) => m.routeId === "/_authenticated/workspace/reports/$category/$reportId");
  if (hasChild) return <Outlet />;

  const cat = REPORT_CATEGORIES.find((c) => c.key === (category as any));
  if (!cat) return <div className="text-sm text-muted-foreground">Unknown category.</div>;

  if (cat.key === "custom") return <CustomBuilderPage />;
  if (cat.key === "saved") return <SavedReportsPage />;
  if (cat.key === "ai-insights") return <AIInsightsPage />;

  return <CategoryList categoryKey={cat.key} label={cat.label} description={cat.description} accent={cat.accent} />;
}

function CategoryList({ categoryKey, label, description, accent }: { categoryKey: string; label: string; description: string; accent: string; }) {
  const [q, setQ] = useState("");
  const list = REPORTS.filter((r) => r.category === categoryKey).filter((r) =>
    !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.description.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="outline" className={cn("text-[10px] uppercase tracking-widest", accent)}>{label.replace(" Reports", "")}</Badge>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{label}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports" className="h-9 w-64 pl-8 text-sm" />
          </div>
          <Link to={"/workspace/reports/custom" as any}>
            <Button size="sm" variant="outline"><Plus className="mr-1.5 h-4 w-4" />New report</Button>
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => (
          <Link
            key={r.id}
            to={`/workspace/reports/${categoryKey}/${r.id}` as any}
            className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  {r.favourite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />} {r.name}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-60 group-hover:text-primary group-hover:opacity-100" />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="rounded bg-muted px-1.5 py-0.5">Table</span>
              <span className="rounded bg-muted px-1.5 py-0.5">Chart</span>
              <span className="rounded bg-muted px-1.5 py-0.5">Pivot</span>
            </div>
          </Link>
        ))}
        {list.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No reports match "{q}".
          </div>
        )}
      </div>
    </div>
  );
}

function CustomBuilderPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /><h2 className="text-xl font-semibold">Custom Report Builder</h2></div>
        <p className="mt-1 text-sm text-muted-foreground">Drag dimensions, measures, filters & calculated fields to build any report.</p>
      </div>
      <ReportBuilder />
    </div>
  );
}

function SavedReportsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-primary" /><h2 className="text-xl font-semibold">Saved & Scheduled Reports</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Your saved views and scheduled deliveries.</p>
        </div>
        <Button size="sm"><Plus className="mr-1.5 h-4 w-4" />New schedule</Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-semibold">Report</th>
              <th className="px-4 py-2.5 text-left font-semibold">Category</th>
              <th className="px-4 py-2.5 text-left font-semibold">Schedule</th>
              <th className="px-4 py-2.5 text-left font-semibold">Owner</th>
              <th className="px-4 py-2.5 text-left font-semibold">Format</th>
              <th className="px-4 py-2.5 text-right font-semibold">Recipients</th>
              <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {SAVED_REPORTS.map((s) => (
              <tr key={s.id} className="border-b border-border/60 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{s.name}</td>
                <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px] uppercase">{s.category}</Badge></td>
                <td className="px-4 py-2.5 text-muted-foreground"><CalendarClock className="mr-1 inline h-3.5 w-3.5" />{s.schedule}</td>
                <td className="px-4 py-2.5">{s.owner}</td>
                <td className="px-4 py-2.5"><Badge variant="secondary" className="text-[10px]">{s.format}</Badge></td>
                <td className="px-4 py-2.5 text-right tabular-nums">{s.recipients}</td>
                <td className="px-4 py-2.5 text-right">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"><Mail className="mr-1 h-3.5 w-3.5" />Send now</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AIInsightsPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-600" /><h2 className="text-xl font-semibold">AI Insights</h2></div>
        <p className="mt-1 text-sm text-muted-foreground">Ask questions in natural language and get executive-ready answers.</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {AI_SUGGESTIONS.map((s) => (
          <span key={s} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">{s}</span>
        ))}
      </div>
      <AIInsightsPanel variant="page" />
    </div>
  );
}