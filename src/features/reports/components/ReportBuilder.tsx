import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BUILDER_FIELDS } from "../data";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Layers, Ruler, Filter, Sigma, ChartBar, ChartLine, ChartPie, Save, Eye, Plus, X, GripVertical,
} from "lucide-react";

type Bucket = "dimensions" | "measures" | "filters";
type PickedField = { name: string; bucket: Bucket };

const CHART_TYPES = [
  { key: "bar",  label: "Bar",  icon: ChartBar },
  { key: "line", label: "Line", icon: ChartLine },
  { key: "pie",  label: "Pie",  icon: ChartPie },
];

export function ReportBuilder() {
  const [picked, setPicked] = useState<PickedField[]>([
    { name: "Region", bucket: "dimensions" },
    { name: "Revenue", bucket: "measures" },
  ]);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  const [calc, setCalc] = useState<{ name: string; formula: string }[]>([
    { name: "Gross Margin %", formula: "(Revenue - Cost) / Revenue" },
  ]);
  const [reportName, setReportName] = useState("Untitled Report");

  const onDragStart = (e: React.DragEvent, name: string, bucket: Bucket) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ name, bucket }));
  };
  const onDrop = (e: React.DragEvent, bucket: Bucket) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("text/plain");
      const f = JSON.parse(raw) as PickedField;
      if (f.bucket !== bucket) return;
      if (picked.some((p) => p.name === f.name && p.bucket === f.bucket)) return;
      setPicked((p) => [...p, f]);
    } catch {}
  };
  const remove = (f: PickedField) => setPicked((p) => p.filter((x) => !(x.name === f.name && x.bucket === f.bucket)));

  const previewData = Array.from({ length: 6 }, (_, i) => ({
    x: ["North", "South", "East", "West", "Central", "NE"][i],
    value: 200000 + i * 42000 + (i % 2 ? 65000 : 0),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Field palette */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Layers className="h-4 w-4 text-primary" /> Fields
        </div>
        <FieldGroup title="Dimensions" icon={Layers} bucket="dimensions" onDragStart={onDragStart} />
        <FieldGroup title="Measures"   icon={Ruler}  bucket="measures"   onDragStart={onDragStart} />
        <FieldGroup title="Filters"    icon={Filter} bucket="filters"    onDragStart={onDragStart} />

        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Sigma className="h-3.5 w-3.5" /> Calculated fields
          </div>
          {calc.map((c, i) => (
            <div key={i} className="mb-1 rounded-md border border-dashed border-border bg-muted/30 p-2 text-xs">
              <div className="font-medium">{c.name}</div>
              <div className="mt-0.5 text-muted-foreground">{c.formula}</div>
            </div>
          ))}
          <Button
            size="sm" variant="outline" className="mt-1 h-7 w-full text-xs"
            onClick={() => setCalc((c) => [...c, { name: `Calc ${c.length + 1}`, formula: "Revenue * 0.18" }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add calculated field
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
          <Input value={reportName} onChange={(e) => setReportName(e.target.value)} className="h-9 max-w-xs text-sm font-medium" />
          <div className="ml-auto inline-flex rounded-md border border-border bg-background p-0.5">
            {CHART_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setChartType(t.key as any)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium",
                    chartType === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />{t.label}
                </button>
              );
            })}
          </div>
          <Button size="sm" variant="outline"><Eye className="mr-1.5 h-4 w-4" />Preview</Button>
          <Button size="sm"><Save className="mr-1.5 h-4 w-4" />Save Report</Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {(["dimensions", "measures", "filters"] as Bucket[]).map((b) => (
            <DropZone key={b} bucket={b} picked={picked.filter((p) => p.bucket === b)} onDrop={onDrop} onRemove={remove} />
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="text-sm font-semibold">Preview</div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">Live</Badge>
          </div>
          <div className="h-80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={previewData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="x" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />
                <Legend />
                <Bar dataKey="value" name={picked.find((p) => p.bucket === "measures")?.name ?? "Value"} fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ title, icon: Icon, bucket, onDragStart }: {
  title: string; icon: any; bucket: Bucket;
  onDragStart: (e: React.DragEvent, name: string, bucket: Bucket) => void;
}) {
  const items = BUILDER_FIELDS[bucket];
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="space-y-1">
        {items.map((f) => (
          <div
            key={f}
            draggable
            onDragStart={(e) => onDragStart(e, f, bucket)}
            className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:border-primary/40 hover:bg-primary/5"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" /> {f}
          </div>
        ))}
      </div>
    </div>
  );
}

function DropZone({ bucket, picked, onDrop, onRemove }: {
  bucket: Bucket;
  picked: PickedField[];
  onDrop: (e: React.DragEvent, b: Bucket) => void;
  onRemove: (f: PickedField) => void;
}) {
  const labels: Record<Bucket, string> = { dimensions: "Rows / Dimensions", measures: "Values / Measures", filters: "Filters" };
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, bucket)}
      className="min-h-[110px] rounded-xl border border-dashed border-border bg-card p-3"
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{labels[bucket]}</div>
      {picked.length === 0 ? (
        <div className="flex h-14 items-center justify-center text-xs text-muted-foreground">Drop {bucket} here</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {picked.map((p) => (
            <span key={p.name} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
              {p.name}
              <button onClick={() => onRemove(p)} className="rounded hover:bg-primary/20"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}