import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanySetting, useSetCompanySetting } from "@/features/shared/doc-integration";
import { Workflow, ShieldCheck, PackageSearch, Mail, FileText, Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/administration/integration-toggles")({
  component: IntegrationTogglesPage,
});

function ToggleRow({
  settingKey, title, description, Icon,
}: { settingKey: string; title: string; description: string; Icon: typeof Workflow }) {
  const { data } = useCompanySetting<boolean>(settingKey);
  const set = useSetCompanySetting();
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-muted"><Icon className="h-4 w-4" /></div>
        <div>
          <Label className="font-medium">{title}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={!!data}
        onCheckedChange={(v) => set.mutate({ key: settingKey, value: v })}
      />
    </div>
  );
}

function NumberRow({
  settingKey, title, description, Icon,
}: { settingKey: string; title: string; description: string; Icon: typeof Workflow }) {
  const { data } = useCompanySetting<number>(settingKey);
  const set = useSetCompanySetting();
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-muted"><Icon className="h-4 w-4" /></div>
        <div>
          <Label className="font-medium">{title}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Input
        type="number"
        defaultValue={data ?? 0}
        className="w-40"
        onBlur={(e) => set.mutate({ key: settingKey, value: Number(e.target.value) })}
      />
    </div>
  );
}

function IntegrationTogglesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integration Settings</h1>
        <p className="text-sm text-muted-foreground">Control automatic downstream postings across Sales, Procurement, Inventory, Finance and GST.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approvals</CardTitle>
          <CardDescription>Route documents through the approval matrix before they post downstream.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ToggleRow settingKey="approvals.enabled" Icon={ShieldCheck}
            title="Require approvals" description="When on, Quotations / SOs / POs above the threshold need approver sign-off before posting." />
          <NumberRow settingKey="approvals.threshold" Icon={FileText}
            title="Approval threshold (INR)" description="Documents with grand total at or above this value require approval." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sales (Order to Cash)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ToggleRow settingKey="credit_check.enabled" Icon={ShieldCheck}
            title="Customer credit check" description="Block Sales Orders when a customer's outstanding + new order exceeds credit limit." />
          <ToggleRow settingKey="einvoice.enabled" Icon={FileText}
            title="Generate e-Invoice payload" description="On Invoice posting, build IRN-ready JSON and store it against the invoice." />
          <NumberRow settingKey="eway_bill.min_value" Icon={Truck}
            title="e-Way Bill minimum value (INR)" description="Generate e-Way Bill payload only when invoice grand total ≥ this value." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Procurement (Procure to Pay)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ToggleRow settingKey="auto_reorder_indent" Icon={PackageSearch}
            title="Auto-create Purchase Indent on low stock" description="When on-hand drops below reorder level, draft an indent automatically." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ToggleRow settingKey="email.enabled" Icon={Mail}
            title="Email notifications" description="Queue email alerts for approvals, dispatch, invoices, payments. Actual sending activates once a sender domain is verified." />
        </CardContent>
      </Card>
    </div>
  );
}