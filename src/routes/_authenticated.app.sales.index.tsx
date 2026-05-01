import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inr } from "@/lib/sales-utils";
import { TrendingUp, FileText, ClipboardList, Receipt, IndianRupee, Percent, Target, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/sales/")({
  component: SalesOverview,
});

function SalesOverview() {
  const { company } = useAuth();
  const companyId = company?.id;

  const { data, isLoading } = useQuery({
    enabled: !!companyId,
    queryKey: ["sales-overview", companyId],
    queryFn: async () => {
      const [leads, quotations, orders, invoices] = await Promise.all([
        supabase.from("leads").select("id,status,expected_value,win_probability").eq("company_id", companyId!),
        supabase.from("quotations").select("id,status,grand_total").eq("company_id", companyId!),
        supabase.from("sales_orders").select("id,status,grand_total").eq("company_id", companyId!),
        supabase.from("invoices").select("id,status,grand_total,amount_paid,amount_due").eq("company_id", companyId!),
      ]);
      return {
        leads: leads.data ?? [],
        quotations: quotations.data ?? [],
        orders: orders.data ?? [],
        invoices: invoices.data ?? [],
      };
    },
  });

  const leads = data?.leads ?? [];
  const quotations = data?.quotations ?? [];
  const orders = data?.orders ?? [];
  const invoices = data?.invoices ?? [];

  const openLeads = leads.filter((l) => l.status !== "won" && l.status !== "lost");
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const conversion = leads.length ? (wonLeads / leads.length) * 100 : 0;
  const forecast = openLeads.reduce((s, l) => s + Number(l.expected_value) * (Number(l.win_probability) / 100), 0);
  const revenue = invoices.filter((i) => i.status === "paid" || i.status === "partially_paid").reduce((s, i) => s + Number(i.amount_paid), 0);
  const outstanding = invoices.reduce((s, i) => s + Number(i.amount_due), 0);

  const kpis = [
    { label: "Paid Revenue", value: inr(revenue), icon: IndianRupee, hint: `${invoices.length} invoices` },
    { label: "Outstanding", value: inr(outstanding), icon: Wallet, hint: "Across all invoices" },
    { label: "Forecast (weighted)", value: inr(forecast), icon: Target, hint: `${openLeads.length} open leads` },
    { label: "Conversion rate", value: `${conversion.toFixed(1)}%`, icon: Percent, hint: `${wonLeads} won / ${leads.length} leads` },
  ];

  const counts = [
    { label: "Leads", value: leads.length, icon: TrendingUp, to: "/app/sales/pipeline" },
    { label: "Quotations", value: quotations.length, icon: FileText, to: "/app/sales/quotations" },
    { label: "Sales Orders", value: orders.length, icon: ClipboardList, to: "/app/sales/orders" },
    { label: "Invoices", value: invoices.length, icon: Receipt, to: "/app/sales/invoices" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{k.label}</div>
                  <div className="mt-2 text-2xl font-bold">{isLoading ? "—" : k.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{k.hint}</div>
                </div>
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                  <k.icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline at a glance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {counts.map((c) => (
              <Link
                key={c.label}
                to={c.to}
                className="rounded-md border border-border p-4 hover:border-accent transition-colors"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <c.icon className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-widest">{c.label}</span>
                </div>
                <div className="mt-2 text-2xl font-bold">{c.value}</div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
