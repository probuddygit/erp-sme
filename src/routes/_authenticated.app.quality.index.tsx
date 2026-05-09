import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/quality/")({
  component: QualityDashboard,
});

type Insp = { id: string; inspection_number: string; stage: string; result: string; inspection_date: string; item_name: string | null; batch_no: string | null };
type Ncr = { id: string; ncr_number: string; severity: string; status: string; raised_date: string; defect_description: string };

function QualityDashboard() {
  const { company } = useAuth();
  const [stats, setStats] = useState({ total: 0, accepted: 0, rejected: 0, pending: 0, openNcr: 0 });
  const [recent, setRecent] = useState<Insp[]>([]);
  const [ncrs, setNcrs] = useState<Ncr[]>([]);

  useEffect(() => {
    if (!company?.id) return;
    (async () => {
      const [{ data: insp }, { data: ncrRows }] = await Promise.all([
        supabase.from("qc_inspections").select("id,inspection_number,stage,result,inspection_date,item_name,batch_no").eq("company_id", company.id).order("inspection_date", { ascending: false }).limit(50),
        supabase.from("ncr_records").select("id,ncr_number,severity,status,raised_date,defect_description").eq("company_id", company.id).order("raised_date", { ascending: false }).limit(10),
      ]);
      const all = insp ?? [];
      setStats({
        total: all.length,
        accepted: all.filter((r) => r.result === "accepted" || r.result === "accepted_with_deviation").length,
        rejected: all.filter((r) => r.result === "rejected").length,
        pending: all.filter((r) => r.result === "pending").length,
        openNcr: (ncrRows ?? []).filter((n) => n.status !== "closed" && n.status !== "resolved").length,
      });
      setRecent(all.slice(0, 8));
      setNcrs(ncrRows ?? []);
    })();
  }, [company?.id]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <Stat icon={ClipboardCheck} label="Inspections" value={String(stats.total)} />
        <Stat icon={CheckCircle2} label="Accepted" value={String(stats.accepted)} />
        <Stat icon={XCircle} label="Rejected" value={String(stats.rejected)} />
        <Stat icon={ClipboardCheck} label="Pending" value={String(stats.pending)} />
        <Stat icon={AlertTriangle} label="Open NCRs" value={String(stats.openNcr)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent inspections</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No inspections yet. <Link to="/app/quality/inspections" className="text-accent underline">Create one</Link>.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.inspection_number} · <span className="text-muted-foreground font-normal">{r.item_name ?? "—"}</span></div>
                      <div className="text-xs text-muted-foreground">{r.inspection_date} · {r.stage.replace("_", " ")}{r.batch_no ? ` · batch ${r.batch_no}` : ""}</div>
                    </div>
                    <ResultBadge result={r.result} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent NCRs</CardTitle></CardHeader>
          <CardContent>
            {ncrs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No NCRs raised. <Link to="/app/quality/ncr" className="text-accent underline">Open dashboard</Link>.</p>
            ) : (
              <div className="space-y-2">
                {ncrs.map((n) => (
                  <div key={n.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{n.ncr_number}</div>
                      <div className="text-xs text-muted-foreground truncate">{n.raised_date} · {n.defect_description}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge variant="outline">{n.severity}</Badge>
                      <Badge>{n.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResultBadge({ result }: { result: string }) {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    accepted: "default",
    accepted_with_deviation: "secondary",
    rejected: "destructive",
    pending: "outline",
  };
  return <Badge variant={map[result] ?? "outline"}>{result.replace(/_/g, " ")}</Badge>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof ClipboardCheck; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}