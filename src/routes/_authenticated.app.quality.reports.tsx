import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/quality/reports")({
  component: QualityReports,
});

type Insp = { id: string; inspection_number: string; stage: string; result: string; inspection_date: string; item_name: string | null; batch_no: string | null; reference_number: string | null; quantity_inspected: number; quantity_accepted: number; quantity_rejected: number };
type Ncr = { id: string; ncr_number: string; raised_date: string; severity: string; status: string; batch_no: string | null; item_name: string | null; defect_description: string };

function QualityReports() {
  const { company } = useAuth();
  const [insp, setInsp] = useState<Insp[]>([]);
  const [ncr, setNcr] = useState<Ncr[]>([]);
  const [batchQuery, setBatchQuery] = useState("");

  useEffect(() => {
    if (!company?.id) return;
    (async () => {
      const [{ data: i }, { data: n }] = await Promise.all([
        supabase.from("qc_inspections").select("*").eq("company_id", company.id).order("inspection_date", { ascending: false }),
        supabase.from("ncr_records").select("*").eq("company_id", company.id).order("raised_date", { ascending: false }),
      ]);
      setInsp((i ?? []) as Insp[]);
      setNcr((n ?? []) as Ncr[]);
    })();
  }, [company?.id]);

  const stats = useMemo(() => {
    const byStage: Record<string, { total: number; rej: number }> = {};
    let totalI = 0, totalA = 0, totalR = 0;
    for (const r of insp) {
      const s = r.stage;
      byStage[s] ??= { total: 0, rej: 0 };
      byStage[s].total += 1;
      if (r.result === "rejected") byStage[s].rej += 1;
      totalI += Number(r.quantity_inspected);
      totalA += Number(r.quantity_accepted);
      totalR += Number(r.quantity_rejected);
    }
    const fpy = totalI > 0 ? (totalA / totalI) * 100 : 0;
    const rejRate = totalI > 0 ? (totalR / totalI) * 100 : 0;
    return { byStage, totalI, totalA, totalR, fpy, rejRate };
  }, [insp]);

  const topDefects = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of ncr) {
      const k = (r.defect_description ?? "").slice(0, 60) || "Unknown";
      m[k] = (m[k] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [ncr]);

  const trace = useMemo(() => {
    if (!batchQuery.trim()) return null;
    const q = batchQuery.trim().toLowerCase();
    const i = insp.filter((r) => (r.batch_no ?? "").toLowerCase().includes(q));
    const n = ncr.filter((r) => (r.batch_no ?? "").toLowerCase().includes(q));
    return { insp: i, ncr: n };
  }, [batchQuery, insp, ncr]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <KPI label="Qty inspected" value={stats.totalI.toLocaleString("en-IN")} />
        <KPI label="Qty accepted" value={stats.totalA.toLocaleString("en-IN")} />
        <KPI label="First pass yield" value={`${stats.fpy.toFixed(1)}%`} />
        <KPI label="Rejection rate" value={`${stats.rejRate.toFixed(1)}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Inspections by stage</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Stage</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Rejected</TableHead><TableHead className="text-right">Rate</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.keys(stats.byStage).length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
                ) : Object.entries(stats.byStage).map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell className="capitalize">{k.replace("_", " ")}</TableCell>
                    <TableCell className="text-right font-mono">{v.total}</TableCell>
                    <TableCell className="text-right font-mono">{v.rej}</TableCell>
                    <TableCell className="text-right font-mono">{v.total ? ((v.rej / v.total) * 100).toFixed(1) : "0.0"}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top defects (NCR)</CardTitle></CardHeader>
          <CardContent>
            {topDefects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No NCRs recorded.</p>
            ) : (
              <div className="space-y-2">
                {topDefects.map(([k, v]) => {
                  const pct = (v / ncr.length) * 100;
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate pr-2">{k}</span>
                        <span className="font-mono text-xs text-muted-foreground">{v}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Batch traceability</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm space-y-1.5">
            <Label>Batch / Lot number</Label>
            <Input placeholder="e.g. BATCH-001" value={batchQuery} onChange={(e) => setBatchQuery(e.target.value)} />
          </div>
          {trace && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Inspections</div>
                {trace.insp.length === 0 ? <p className="text-sm text-muted-foreground">No inspections.</p> : (
                  <div className="space-y-1.5">
                    {trace.insp.map((r) => (
                      <div key={r.id} className="flex items-center justify-between border-b border-border pb-1.5 last:border-0 text-sm">
                        <div>
                          <div className="font-mono text-xs">{r.inspection_number}</div>
                          <div className="text-xs text-muted-foreground">{r.inspection_date} · {r.stage} · {r.item_name ?? "—"}</div>
                        </div>
                        <Badge variant={r.result === "rejected" ? "destructive" : r.result === "accepted" ? "default" : "secondary"}>{r.result.replace(/_/g, " ")}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">NCRs</div>
                {trace.ncr.length === 0 ? <p className="text-sm text-muted-foreground">No NCRs.</p> : (
                  <div className="space-y-1.5">
                    {trace.ncr.map((r) => (
                      <div key={r.id} className="flex items-center justify-between border-b border-border pb-1.5 last:border-0 text-sm">
                        <div>
                          <div className="font-mono text-xs">{r.ncr_number}</div>
                          <div className="text-xs text-muted-foreground">{r.raised_date} · {r.defect_description}</div>
                        </div>
                        <Badge variant="outline">{r.severity}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}