import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Table2, BarChart3, Grid3x3, Search, Filter, ArrowUpDown, Download,
  Printer, Mail, CalendarClock, Share2, Star, StarOff, ChevronLeft,
  FileSpreadsheet, FileText, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getReportData, REPORTS, REPORT_CATEGORIES } from "../data";

const PIE_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#f43f5e"];

function fmt(v: any, format?: "number" | "currency" | "percent" | "date" | "text") {
  if (v == null) return "";
  if (format === "currency") return `₹${Number(v).toLocaleString("en-IN")}`;
  if (format === "percent") return `${(Number(v) * 100).toFixed(1)}%`;
  if (format === "number") return Number(v).toLocaleString("en-IN");
  return String(v);
}

type ViewMode = "table" | "chart" | "pivot";

export function ReportViewer({ reportId }: { reportId: string }) {
  const report = REPORTS.find((r) => r.id === reportId);
  const category = REPORT_CATEGORIES.find((c) => c.key === report?.category);
  const data = useMemo(() => getReportData(reportId), [reportId]);

  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [favourite, setFavourite] = useState(!!report?.favourite);
  const [grouped, setGrouped] = useState(false);

  const rows = useMemo(() => {
    let r = data.table.rows;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((row) =>
        Object.values(row).some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return r;
  }, [data, search, sortKey, sortDir]);

  if (!report || !category) {
    return <div className="text-sm text-muted-foreground">Report not found.</div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Link
            to={`/workspace/reports/${category.key}` as any}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> {category.label}
          </Link>
          <div className="mt-1.5 flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{report.name}</h2>
            <button
              onClick={() => setFavourite((v) => !v)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              title="Toggle favourite"
            >
              {favourite ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="h-4 w-4" />}
            </button>
            <Badge variant="outline" className={cn("text-[10px] uppercase tracking-widest", category.accent)}>
              {category.label.replace(" Reports", "")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Download className="mr-1.5 h-4 w-4" />Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Download as</DropdownMenuLabel>
              <DropdownMenuItem><FileText className="mr-2 h-4 w-4" />PDF</DropdownMenuItem>
              <DropdownMenuItem><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</DropdownMenuItem>
              <DropdownMenuItem><FileText className="mr-2 h-4 w-4" />CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm"><Printer className="mr-1.5 h-4 w-4" />Print</Button>
          <Button variant="outline" size="sm"><CalendarClock className="mr-1.5 h-4 w-4" />Schedule</Button>
          <Button variant="outline" size="sm"><Mail className="mr-1.5 h-4 w-4" />Email</Button>
          <Button variant="outline" size="sm"><Share2 className="mr-1.5 h-4 w-4" />Share</Button>
          <Button size="sm"><Sparkles className="mr-1.5 h-4 w-4" />Save</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight">{k.value}</div>
            {k.delta && (
              <div className={cn("mt-1 text-xs",
                k.tone === "success" ? "text-emerald-600" :
                k.tone === "danger" ? "text-rose-600" :
                k.tone === "warn" ? "text-amber-600" : "text-muted-foreground")}>{k.delta}</div>
            )}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-8 w-56 pl-8 text-sm" />
          </div>
          <Button variant="outline" size="sm" className="h-8"><Filter className="mr-1.5 h-3.5 w-3.5" />Filters</Button>
          <Button
            variant={grouped ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setGrouped((v) => !v)}
          >
            <Grid3x3 className="mr-1.5 h-3.5 w-3.5" />Group
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8"><ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />Sort</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {data.table.columns.map((c) => (
                <DropdownMenuItem key={c.key} onClick={() => { setSortKey(c.key); setSortDir((d) => (sortKey === c.key && d === "desc" ? "asc" : "desc")); }}>
                  {c.label} {sortKey === c.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortKey(null)}>Clear sort</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="inline-flex rounded-md border border-border bg-background p-0.5">
          {[
            { key: "table", label: "Table", icon: Table2 },
            { key: "chart", label: "Chart", icon: BarChart3 },
            { key: "pivot", label: "Pivot", icon: Grid3x3 },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                onClick={() => setView(v.key as ViewMode)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
                  view === v.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />{v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border bg-card">
        {view === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {data.table.columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn("px-4 py-2.5 font-semibold cursor-pointer select-none", c.align === "right" ? "text-right" : "text-left")}
                      onClick={() => { setSortKey(c.key); setSortDir((d) => (sortKey === c.key && d === "desc" ? "asc" : "desc")); }}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-border/60 hover:bg-muted/30">
                    {data.table.columns.map((c) => (
                      <td key={c.key} className={cn("px-4 py-2.5 tabular-nums", c.align === "right" ? "text-right" : "text-left")}>
                        {fmt(row[c.key], c.format)}
                      </td>
                    ))}
                  </tr>
                ))}
                {data.table.totals && (
                  <tr className="bg-muted/60 font-semibold">
                    {data.table.columns.map((c) => (
                      <td key={c.key} className={cn("px-4 py-2.5 tabular-nums", c.align === "right" ? "text-right" : "text-left")}>
                        {fmt(data.table.totals![c.key], c.format)}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
              <span>Showing {rows.length} of {data.table.rows.length} records</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Previous</Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Next</Button>
              </div>
            </div>
          </div>
        )}

        {view === "chart" && (
          <div className="h-[420px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(data.chart)}
            </ResponsiveContainer>
          </div>
        )}

        {view === "pivot" && (
          <div className="overflow-x-auto p-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5 text-left font-semibold">{data.pivot.rowHeader} \ {data.pivot.colHeader}</th>
                  {data.pivot.columns.map((c) => (
                    <th key={c} className="px-3 py-2.5 text-right font-semibold">{c}</th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.pivot.rows.map((r, i) => {
                  const rowTotal = data.pivot.values[i].reduce((a, b) => a + b, 0);
                  return (
                    <tr key={r} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-medium">{r}</td>
                      {data.pivot.values[i].map((v, j) => (
                        <td key={j} className="px-3 py-2.5 text-right tabular-nums">₹{v.toLocaleString("en-IN")}</td>
                      ))}
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">₹{rowTotal.toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        Tip: click a column header to sort, or use the <span className="font-medium text-foreground">Group</span> button to bucket rows.
        Drill-down opens the underlying transactions.
      </div>
    </div>
  );
}

function renderChart(chart: ReturnType<typeof getReportData>["chart"]) {
  const first = chart.series[0];
  if (chart.type === "pie") {
    return (
      <PieChart>
        <Pie data={first.data} dataKey="y" nameKey="x" outerRadius={140} innerRadius={70} paddingAngle={2}>
          {first.data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />
        <Legend />
      </PieChart>
    );
  }
  if (chart.type === "line") {
    return (
      <LineChart data={first.data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="x" fontSize={12} stroke="hsl(var(--muted-foreground))" />
        <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
        <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />
        <Legend />
        <Line type="monotone" dataKey="y" name={first.label} stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    );
  }
  if (chart.type === "area") {
    return (
      <AreaChart data={first.data}>
        <defs>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="x" fontSize={12} stroke="hsl(var(--muted-foreground))" />
        <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
        <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />
        <Legend />
        <Area type="monotone" dataKey="y" name={first.label} stroke="#10b981" fill="url(#ag)" strokeWidth={2} />
      </AreaChart>
    );
  }
  // bar
  const merged = first.data.map((d, i) => {
    const row: Record<string, any> = { x: d.x, [first.key]: d.y };
    chart.series.slice(1).forEach((s) => { row[s.key] = s.data[i]?.y ?? 0; });
    return row;
  });
  return (
    <BarChart data={merged}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis dataKey="x" fontSize={12} stroke="hsl(var(--muted-foreground))" />
      <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
      <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />
      <Legend />
      {chart.series.map((s, i) => (
        <Bar key={s.key} dataKey={s.key} name={s.label} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[4, 4, 0, 0]} />
      ))}
    </BarChart>
  );
}