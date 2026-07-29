import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { CreditGauge } from "@/features/crm/components/CreditGauge";
import { Building2, ShieldCheck, ShieldAlert, ArrowLeft, Loader2 } from "lucide-react";
import { useAccount, useAccount360, formatINR, formatDate, formatDateTime, validateGstinFormat } from "@/features/crm/api";

export const Route = createFileRoute("/_authenticated/workspace/crm/accounts/$accountId")({
  component: Account360Page,
});

function Account360Page() {
  const { accountId } = Route.useParams();
  const { data: acc, isLoading } = useAccount(accountId);
  const { data: agg } = useAccount360(accountId);

  if (isLoading) return <Card><CardContent className="p-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></CardContent></Card>;
  if (!acc) return <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Account not found.</CardContent></Card>;

  const gstinOk = validateGstinFormat(acc.gstin);
  const outstanding = agg?.outstanding ?? 0;

  return (
    <div className="space-y-4">
      <Link to="/workspace/crm/accounts" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All accounts
      </Link>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">{acc.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {acc.gstin && (
                    <span className="inline-flex items-center gap-1">
                      GSTIN {acc.gstin}
                      {gstinOk ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> : <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />}
                    </span>
                  )}
                  {acc.territory && <span>· {acc.territory}</span>}
                  <StatusBadge label={acc.status} tone={acc.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"} />
                </div>
              </div>
            </div>
            <div className="w-full sm:w-72">
              <CreditGauge limit={Number(acc.credit_limit ?? 0)} outstanding={outstanding} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card><CardContent className="p-5 grid gap-4 sm:grid-cols-2">
            <Meta label="PAN" value={acc.pan ?? "—"} />
            <Meta label="Credit days" value={`${acc.credit_days} days`} />
            <Meta label="Billing address" value={<span className="whitespace-pre-wrap">{acc.billing_address ?? "—"}</span>} />
            <Meta label="Shipping address" value={<span className="whitespace-pre-wrap">{acc.shipping_address ?? "—"}</span>} />
            <Meta label="Created" value={formatDateTime(acc.created_at)} />
            <Meta label="Last updated" value={formatDateTime(acc.updated_at)} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <Card><CardContent className="p-4">
            {(agg?.contacts?.length ?? 0) === 0 ? <Empty>No contacts linked to this account.</Empty> : (
              <ul className="divide-y divide-border">
                {agg!.contacts.map((c: Record<string, unknown>) => (
                  <li key={c.id as string} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{(c.name as string) || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "—"}</div>
                      <div className="text-xs text-muted-foreground">{(c.designation as string) ?? "—"} · {(c.email as string) ?? "—"} · {(c.phone as string) ?? "—"}</div>
                    </div>
                    {c.is_primary ? <StatusBadge label="Primary" tone="bg-emerald-50 text-emerald-700 border-emerald-200" /> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="opportunities" className="mt-4">
          <Card><CardContent className="p-4">
            {(agg?.opportunities?.length ?? 0) === 0 ? <Empty>No opportunities yet.</Empty> : (
              <ul className="divide-y divide-border">
                {agg!.opportunities.map((o: Record<string, unknown>) => (
                  <li key={o.id as string} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{o.name as string}</div>
                      <div className="text-xs text-muted-foreground">Stage: {o.stage as string} · Close {formatDate(o.expected_close as string)}</div>
                    </div>
                    <span className="font-medium">{formatINR(Number(o.value ?? 0))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <Card><CardContent className="p-4">
            {!acc.customer_id ? <Empty>Link this account to a customer master to see orders.</Empty> :
             (agg?.orders?.length ?? 0) === 0 ? <Empty>No sales orders yet.</Empty> : (
              <ul className="divide-y divide-border">
                {(agg!.orders as Record<string, unknown>[]).map((o) => (
                  <li key={o.id as string} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{o.so_number as string}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(o.order_date as string)} · {o.status as string}</div>
                    </div>
                    <span className="font-medium">{formatINR(Number(o.total_amount ?? 0))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <Card><CardContent className="p-4">
            {!acc.customer_id ? <Empty>Link this account to a customer master to see the ledger.</Empty> :
             (agg?.invoices?.length ?? 0) === 0 ? <Empty>No invoices yet.</Empty> : (
              <ul className="divide-y divide-border">
                {(agg!.invoices as Record<string, unknown>[]).map((i) => {
                  const bal = Number(i.total_amount ?? 0) - Number(i.paid_amount ?? 0);
                  return (
                    <li key={i.id as string} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{i.invoice_number as string}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(i.invoice_date as string)} · Due {formatDate(i.due_date as string)} · {i.status as string}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatINR(Number(i.total_amount ?? 0))}</div>
                        <div className={`text-xs ${bal > 0 ? "text-rose-700" : "text-emerald-700"}`}>Bal {formatINR(bal)}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <Card><CardContent className="p-4">
            {(agg?.activities?.length ?? 0) === 0 ? <Empty>No activities recorded.</Empty> : (
              <ul className="divide-y divide-border">
                {(agg!.activities as Record<string, unknown>[]).map((a) => (
                  <li key={a.id as string} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{a.subject as string}</div>
                      <span className="text-xs text-muted-foreground">{formatDateTime(a.scheduled_at as string)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">{a.activity_type as string} · {(a.channel as string) ?? "—"}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">{children}</div>;
}