import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DataListPage, Pill } from "@/features/admin/DataListPage";
import { SettingsSection, FieldRow, SettingsGrid } from "@/features/admin/SettingsShell";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/workspace/administration/subscription")({
  component: SubPage,
});

function UsageBar({ label, used, total, unit }: { label: string; used: number; total: number; unit?: string }) {
  const pct = Math.min(100, (used / total) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{used}{unit} <span className="text-muted-foreground font-normal">/ {total}{unit}</span></span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function SubPage() {
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
              <div className="mt-1 text-2xl font-semibold">Enterprise</div>
              <div className="mt-1 text-sm text-muted-foreground">Billed annually · Next renewal 31 Mar 2027</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">₹ 4,80,000<span className="text-sm font-normal text-muted-foreground"> / year</span></div>
              <div className="text-xs text-muted-foreground">excl. GST</div>
            </div>
            <div className="w-full flex justify-end gap-2">
              <Button variant="outline">Cancel plan</Button>
              <Button>Upgrade plan</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="usage">
        <Card><CardContent className="grid gap-5 p-6 sm:grid-cols-2">
          <UsageBar label="Users" used={128} total={500} />
          <UsageBar label="Storage" used={142} total={1024} unit=" GB" />
          <UsageBar label="API calls (this month)" used={1200000} total={10000000} />
          <UsageBar label="Companies" used={3} total={10} />
          <UsageBar label="Branches" used={6} total={25} />
          <UsageBar label="Emails sent (this month)" used={4820} total={25000} />
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="invoices">
        <DataListPage rowActions={false} searchKeys={["number"]}
          columns={[
            { key: "number", header: "Invoice" },
            { key: "date", header: "Date" },
            { key: "period", header: "Period" },
            { key: "amount", header: "Amount" },
            { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Paid" ? "success" : "warn"}>{r.status}</Pill> },
          ]}
          rows={[
            { id: "1", number: "SUB-INV-2026-04-001", date: "01 Apr 2026", period: "FY 2026-27", amount: "₹ 5,66,400", status: "Paid" },
            { id: "2", number: "SUB-INV-2025-04-001", date: "01 Apr 2025", period: "FY 2025-26", amount: "₹ 4,72,000", status: "Paid" },
            { id: "3", number: "SUB-INV-2024-04-001", date: "01 Apr 2024", period: "FY 2024-25", amount: "₹ 3,54,000", status: "Paid" },
          ] as any}
        />
      </TabsContent>

      <TabsContent value="billing">
        <SettingsGrid>
          <SettingsSection title="Billing contact">
            <FieldRow label="Company name"><Input defaultValue="Ind Guru Enterprises Pvt Ltd" /></FieldRow>
            <FieldRow label="GSTIN"><Input defaultValue="27AAACI1234H1ZV" /></FieldRow>
            <FieldRow label="Email"><Input defaultValue="finance@indguru.com" /></FieldRow>
          </SettingsSection>
          <SettingsSection title="Payment method">
            <FieldRow label="Method"><span className="text-sm">Bank transfer (NEFT/RTGS)</span></FieldRow>
            <FieldRow label="Card on file"><span className="text-sm">•••• 4242 · exp 08/29</span></FieldRow>
          </SettingsSection>
        </SettingsGrid>
      </TabsContent>
    </Tabs>
  );
}