import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, AlertTriangle, AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/maintenance/alerts")({
  component: AlertsPage,
});

type Severity = "info" | "warning" | "critical";
type Status = "active" | "acknowledged" | "resolved" | "dismissed";
type Category =
  | "maintenance_due" | "runtime_threshold" | "breakdown"
  | "excess_downtime" | "delayed_maintenance" | "low_stock" | "other";

type Alert = {
  id: string;
  severity: Severity;
  category: Category;
  status: Status;
  title: string;
  message: string | null;
  machine_id: string | null;
  ticket_id: string | null;
  item_id: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
};

const CAT_LABEL: Record<Category, string> = {
  maintenance_due: "Maintenance Due",
  runtime_threshold: "Runtime Threshold",
  breakdown: "Breakdown",
  excess_downtime: "Excess Downtime",
  delayed_maintenance: "Delayed Maintenance",
  low_stock: "Low Stock",
  other: "Other",
};

function sevIcon(s: Severity) {
  if (s === "critical") return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (s === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-blue-500" />;
}
function sevVariant(s: Severity): "default" | "secondary" | "destructive" | "outline" {
  if (s === "critical") return "destructive";
  if (s === "warning") return "default";
  return "secondary";
}
function statusVariant(s: Status): "default" | "secondary" | "destructive" | "outline" {
  if (s === "active") return "destructive";
  if (s === "acknowledged") return "default";
  if (s === "resolved") return "secondary";
  return "outline";
}

function AlertsPage() {
  const { company, isCompanyAdmin, hasRole, user } = useAuth();
  const qc = useQueryClient();
  const canManage = isCompanyAdmin || hasRole("maintenance") || hasRole("production");
  const [sevFilter, setSevFilter] = useState<"all" | Severity>("all");
  const [tab, setTab] = useState<"active" | "all" | "timeline">("active");

  useEffect(() => {
    if (!company?.id) return;
    const ch = supabase.channel(`alerts-${company.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `company_id=eq.${company.id}` },
        () => qc.invalidateQueries({ queryKey: ["alerts", company.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [company?.id, qc]);

  const { data: alerts } = useQuery({
    enabled: !!company?.id,
    queryKey: ["alerts", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("alerts").select("*")
        .eq("company_id", company!.id).order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as Alert[];
    },
  });

  const filtered = useMemo(() => {
    let list = alerts ?? [];
    if (sevFilter !== "all") list = list.filter(a => a.severity === sevFilter);
    if (tab === "active") list = list.filter(a => a.status === "active" || a.status === "acknowledged");
    return list;
  }, [alerts, sevFilter, tab]);

  const stats = useMemo(() => {
    const list = alerts ?? [];
    return {
      total: list.length,
      active: list.filter(a => a.status === "active").length,
      critical: list.filter(a => a.status === "active" && a.severity === "critical").length,
      warning: list.filter(a => a.status === "active" && a.severity === "warning").length,
    };
  }, [alerts]);

  const setStatus = async (id: string, status: Status) => {
    const patch: Record<string, unknown> = { status };
    if (status === "acknowledged") { patch.acknowledged_by = user?.id ?? null; patch.acknowledged_at = new Date().toISOString(); }
    if (status === "resolved") patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("alerts").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Alert ${status}`);
    qc.invalidateQueries({ queryKey: ["alerts", company?.id] });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Total" value={String(stats.total)} icon={<Bell className="h-4 w-4" />} />
        <Stat label="Active" value={String(stats.active)} tone={stats.active > 0 ? "warn" : undefined} />
        <Stat label="Critical" value={String(stats.critical)} tone={stats.critical > 0 ? "destructive" : undefined} />
        <Stat label="Warning" value={String(stats.warning)} tone={stats.warning > 0 ? "warn" : undefined} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={sevFilter} onValueChange={(v) => setSevFilter(v as typeof sevFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsContent value="active" className="m-0">
          <AlertList alerts={filtered} canManage={canManage} onSet={setStatus} />
        </TabsContent>
        <TabsContent value="all" className="m-0">
          <AlertList alerts={filtered} canManage={canManage} onSet={setStatus} />
        </TabsContent>
        <TabsContent value="timeline" className="m-0">
          <Timeline alerts={filtered} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AlertList({ alerts, canManage, onSet }: { alerts: Alert[]; canManage: boolean; onSet: (id: string, s: Status) => void }) {
  if (!alerts.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No alerts.</CardContent></Card>;
  }
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <Card key={a.id}>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="mt-0.5">{sevIcon(a.severity)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{a.title}</span>
                <Badge variant={sevVariant(a.severity)} className="text-[10px] uppercase">{a.severity}</Badge>
                <Badge variant="outline" className="text-[10px]">{CAT_LABEL[a.category]}</Badge>
                <Badge variant={statusVariant(a.status)} className="text-[10px] uppercase">{a.status}</Badge>
              </div>
              {a.message && <div className="text-sm text-muted-foreground mt-1">{a.message}</div>}
              <div className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</div>
            </div>
            {canManage && a.status !== "resolved" && a.status !== "dismissed" && (
              <div className="flex gap-1 shrink-0">
                {a.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => onSet(a.id, "acknowledged")}>
                    Ack
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => onSet(a.id, "resolved")}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />Resolve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onSet(a.id, "dismissed")}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Timeline({ alerts }: { alerts: Alert[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, Alert[]>();
    alerts.forEach((a) => {
      const k = new Date(a.created_at).toLocaleDateString();
      const cur = map.get(k) ?? [];
      cur.push(a);
      map.set(k, cur);
    });
    return Array.from(map.entries());
  }, [alerts]);
  if (!groups.length) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No timeline events.</CardContent></Card>;
  }
  return (
    <div className="space-y-6">
      {groups.map(([day, list]) => (
        <div key={day}>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{day}</div>
          <div className="border-l-2 border-border pl-4 space-y-3">
            {list.map((a) => (
              <div key={a.id} className="relative">
                <div className="absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full bg-accent" />
                <div className="flex items-center gap-2 flex-wrap">
                  {sevIcon(a.severity)}
                  <span className="font-medium text-sm">{a.title}</span>
                  <Badge variant="outline" className="text-[10px]">{CAT_LABEL[a.category]}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleTimeString()}</span>
                </div>
                {a.message && <div className="text-xs text-muted-foreground mt-0.5">{a.message}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: string; tone?: "warn" | "destructive"; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          {icon}
        </div>
        <div className={`mt-2 text-2xl font-bold tracking-tight ${tone === "warn" ? "text-amber-600" : tone === "destructive" ? "text-destructive" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}