import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DataListPage, Pill } from "@/features/admin/DataListPage";
import { SettingsForm } from "@/features/admin/SettingsForm";
import { useSettingsDoc } from "@/features/admin/admin-api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { fmtTs } from "@/features/admin/logs-api";

export const Route = createFileRoute("/_authenticated/workspace/administration/subscription")({
  component: SubPage,
});

function UsageBar({ label, used, total, unit }: { label: string; used: number; total: number; unit?: string }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{used.toLocaleString("en-IN")}{unit} <span className="text-muted-foreground font-normal">/ {total.toLocaleString("en-IN")}{unit}</span></span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function useUsage() {
  const { company, organization } = useAuth();
  return useQuery({
    enabled: !!company?.id,
    queryKey: ["admin-subscription-usage", company?.id, organization?.id],
    queryFn: async () => {
      const [users, branches, companies, docs] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", company!.id),
        supabase.from("branches").select("id", { count: "exact", head: true }).eq("company_id", company!.id),
        organization?.id
          ? supabase.from("companies").select("id", { count: "exact", head: true }).eq("organization_id", organization.id)
          : supabase.from("companies").select("id", { count: "exact", head: true }).eq("id", company!.id),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("company_id", company!.id),
      ]);
      return {
        users: users.count ?? 0,
        branches: branches.count ?? 0,
        companies: companies.count ?? 0,
        invoices: docs.count ?? 0,
      };
    },
  });
}

function SubPage() {
  const { company } = useAuth();
  const { data: usage } = useUsage();
  const { value: limits } = useSettingsDoc<Record<string, any>>("admin.subscription", {
    plan: company?.plan ?? "Enterprise", billing_cycle: "annual", renewal_date: "", amount: 0,
    limit_users: 100, limit_branches: 25, limit_companies: 10, limit_invoices: 100000,
    billing_name: "", billing_gstin: "", billing_email: "", payment_method: "Bank transfer (NEFT/RTGS)",
  });

  const { data: invoices = [], isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["admin-platform-invoices", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_invoices")
        .select("id, invoice_number, amount, tax, status, due_date, created_at")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

  const invoiceRows = (invoices as any[]).map((i) => ({
    id: i.id,
    number: i.invoice_number ?? i.id.slice(0, 8),
    date: fmtTs(i.created_at),
    period: i.due_date ? `Due ${i.due_date}` : "—",
    amount: `₹ ${(Number(i.amount ?? 0) + Number(i.tax ?? 0)).toLocaleString("en-IN")}`,
    status: i.status ?? "—",
  }));

  return (
    <Tabs defaultValue="plan" className="space-y-4">
      <TabsList>
        <TabsTrigger value="plan">Current Plan</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>

      <TabsContent value="plan">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-6 p-6">
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</div>
              <div className="mt-1 text-2xl font-semibold capitalize">{company?.plan ?? limits.plan}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Billed {limits.billing_cycle}{limits.renewal_date ? ` · Next renewal ${limits.renewal_date}` : ""}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                ₹ {Number(limits.amount ?? 0).toLocaleString("en-IN")}
                <span className="text-sm font-normal text-muted-foreground"> / {limits.billing_cycle === "monthly" ? "month" : "year"}</span>
              </div>
              <div className="text-xs text-muted-foreground">excl. GST</div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="usage">
        <Card><CardContent className="grid gap-5 p-6 sm:grid-cols-2">
          <UsageBar label="Users" used={usage?.users ?? 0} total={Number(limits.limit_users) || 0} />
          <UsageBar label="Companies" used={usage?.companies ?? 0} total={Number(limits.limit_companies) || 0} />
          <UsageBar label="Branches" used={usage?.branches ?? 0} total={Number(limits.limit_branches) || 0} />
          <UsageBar label="Invoices issued" used={usage?.invoices ?? 0} total={Number(limits.limit_invoices) || 0} />
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="invoices">
        <DataListPage rowActions={false} loading={isLoading} searchKeys={["number", "status"]}
          emptyLabel="No subscription invoices yet"
          columns={[
            { key: "number", header: "Invoice" },
            { key: "date", header: "Date" },
            { key: "period", header: "Period" },
            { key: "amount", header: "Amount" },
            { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "paid" ? "success" : "warn"}>{r.status}</Pill> },
          ]}
          rows={invoiceRows as any}
        />
      </TabsContent>

      <TabsContent value="billing">
        <SettingsForm settingsKey="admin.subscription" groups={[
          { title: "Plan & limits", fields: [
            { name: "plan", label: "Plan", default: "Enterprise" },
            { name: "billing_cycle", label: "Billing cycle", type: "select", default: "annual", options: [
              { label: "Annual", value: "annual" }, { label: "Monthly", value: "monthly" },
            ] },
            { name: "renewal_date", label: "Next renewal", type: "date", default: "" },
            { name: "amount", label: "Amount (INR)", type: "number", default: 0 },
            { name: "limit_users", label: "User limit", type: "number", default: 100 },
            { name: "limit_companies", label: "Company limit", type: "number", default: 10 },
            { name: "limit_branches", label: "Branch limit", type: "number", default: 25 },
            { name: "limit_invoices", label: "Invoice limit", type: "number", default: 100000 },
          ] },
          { title: "Billing contact", fields: [
            { name: "billing_name", label: "Company name", default: "" },
            { name: "billing_gstin", label: "GSTIN", default: "" },
            { name: "billing_email", label: "Email", type: "email", default: "" },
            { name: "payment_method", label: "Payment method", default: "Bank transfer (NEFT/RTGS)" },
          ] },
        ]} />
      </TabsContent>
    </Tabs>
  );
}
