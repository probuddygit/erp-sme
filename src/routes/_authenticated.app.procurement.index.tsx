import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, Users, AlertTriangle, CheckCircle2, Clock, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/procurement/")({
  component: ProcurementOverview,
});

function ProcurementOverview() {
  const { company } = useAuth();

  const { data: stats } = useQuery({
    enabled: !!company?.id,
    queryKey: ["proc-stats", company?.id],
    queryFn: async () => {
      const [pos, vinv, suppliers, recent, lowStock] = await Promise.all([
        supabase.from("purchase_orders").select("id, status, grand_total").eq("company_id", company!.id),
        supabase.from("vendor_invoices").select("id, amount_due, status").eq("company_id", company!.id),
        supabase.from("suppliers").select("id").eq("company_id", company!.id).eq("is_active", true),
        supabase.from("purchase_orders").select("id, po_number, status, grand_total, order_date, supplier_id").eq("company_id", company!.id).order("created_at", { ascending: false }).limit(8),
        supabase.from("items").select("id, name, sku, min_stock").eq("company_id", company!.id).gt("min_stock", 0).limit(200),
      ]);
      const poList = pos.data ?? [];
      const vList = vinv.data ?? [];
      const totalCommitted = poList.filter(p => ["approved","sent","partially_received","received"].includes(p.status)).reduce((s, p) => s + Number(p.grand_total), 0);
      const payable = vList.reduce((s, v) => s + Number(v.amount_due ?? 0), 0);
      return {
        poCount: poList.length,
        pendingApproval: poList.filter(p => p.status === "pending_approval").length,
        approved: poList.filter(p => p.status === "approved").length,
        partial: poList.filter(p => p.status === "partially_received").length,
        suppliers: suppliers.data?.length ?? 0,
        totalCommitted,
        payable,
        recent: recent.data ?? [],
        lowStock: lowStock.data ?? [],
      };
    },
  });

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active POs" value={stats?.poCount ?? 0} icon={FileText} />
        <StatCard label="Pending approval" value={stats?.pendingApproval ?? 0} icon={Clock} accent />
        <StatCard label="Committed spend" value={fmt(stats?.totalCommitted ?? 0)} icon={Wallet} />
        <StatCard label="Outstanding payable" value={fmt(stats?.payable ?? 0)} icon={Receipt} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <PipelineTile label="Approved" count={stats?.approved ?? 0} tone="success" />
        <PipelineTile label="Partially received" count={stats?.partial ?? 0} tone="info" />
        <PipelineTile label="Active suppliers" count={stats?.suppliers ?? 0} tone="muted" />
        <PipelineTile label="Stock alert items" count={stats?.lowStock.length ?? 0} tone="warn" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent purchase orders</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/app/procurement/purchase-orders">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {stats?.recent.length ? (
              <div className="divide-y divide-border">
                {stats.recent.map((p: any) => (
                  <Link key={p.id} to="/app/procurement/purchase-orders/$id" params={{ id: p.id }}
                    className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded-md transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{p.po_number}</span>
                        <PoStatusBadge status={p.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{p.order_date}</div>
                    </div>
                    <div className="text-right text-sm font-medium">{fmt(Number(p.grand_total))}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No purchase orders yet. <Link to="/app/procurement/purchase-orders" className="text-accent hover:underline">Create one</Link>.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Low stock alerts</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/app/procurement/indents">Run MRP</Link></Button>
          </CardHeader>
          <CardContent>
            {stats?.lowStock.length ? (
              <div className="text-xs text-muted-foreground mb-2">Items with a defined minimum stock level. Run MRP to auto-create an indent.</div>
            ) : (
              <div className="text-sm text-muted-foreground py-6 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No items have a minimum stock threshold yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: typeof FileText; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <Icon className={accent ? "h-4 w-4 text-accent" : "h-4 w-4 text-muted-foreground"} />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function PipelineTile({ label, count, tone }: { label: string; count: number; tone: "muted" | "info" | "accent" | "success" | "warn" }) {
  const toneClass = {
    muted: "bg-muted text-muted-foreground",
    info: "bg-secondary text-secondary-foreground",
    accent: "bg-accent/15 text-accent",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${toneClass}`}><Users className="h-4 w-4" /></div>
        <div className="mt-3 text-2xl font-bold">{count}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

export function PoStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    pending_approval: { label: "Pending approval", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive" },
    sent: { label: "Sent", cls: "bg-secondary text-secondary-foreground" },
    partially_received: { label: "Partial", cls: "bg-accent/15 text-accent" },
    received: { label: "Received", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    closed: { label: "Closed", cls: "bg-muted text-muted-foreground" },
    cancelled: { label: "Cancelled", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted" };
  return <Badge variant="outline" className={`border-0 ${m.cls}`}>{m.label}</Badge>;
}