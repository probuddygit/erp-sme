import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useSettingsDoc, useSaveSettingsDoc } from "@/features/admin/admin-api";
import { Zap, Slack, MessageSquare, Cloud, CreditCard, Truck, FileSpreadsheet, Mail, Github, BarChart3, Boxes, Building } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/administration/integrations")({
  component: Integrations,
});

const CATALOG = [
  { key: "tally", name: "Tally", icon: FileSpreadsheet, cat: "Accounting", desc: "Sync ledgers, vouchers and masters." },
  { key: "razorpay", name: "Razorpay", icon: CreditCard, cat: "Payments", desc: "Payment links and settlements." },
  { key: "stripe", name: "Stripe", icon: CreditCard, cat: "Payments", desc: "International card payments." },
  { key: "shiprocket", name: "Shiprocket", icon: Truck, cat: "Logistics", desc: "Multi-carrier shipping." },
  { key: "slack", name: "Slack", icon: Slack, cat: "Communication", desc: "Alerts and approvals in Slack." },
  { key: "teams", name: "Microsoft Teams", icon: MessageSquare, cat: "Communication", desc: "Alerts in Teams channels." },
  { key: "google", name: "Google Workspace", icon: Mail, cat: "Productivity", desc: "SSO, Drive and Calendar." },
  { key: "s3", name: "AWS S3", icon: Cloud, cat: "Storage", desc: "Document archival bucket." },
  { key: "github", name: "GitHub", icon: Github, cat: "DevOps", desc: "Ticket linking for IT." },
  { key: "zoho", name: "Zoho Analytics", icon: BarChart3, cat: "BI", desc: "External dashboards." },
  { key: "zapier", name: "Zapier", icon: Zap, cat: "Automation", desc: "5,000+ app automations." },
  { key: "sap", name: "SAP", icon: Building, cat: "ERP", desc: "Master data federation." },
  { key: "amazon", name: "Amazon Seller", icon: Boxes, cat: "Marketplaces", desc: "Order and inventory sync." },
];

interface Conn { connected?: boolean; api_key?: string; endpoint?: string; notes?: string }

function Integrations() {
  const { value, isLoading } = useSettingsDoc<Record<string, Conn>>("admin.integrations", {});
  const save = useSaveSettingsDoc("admin.integrations");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Conn>({});

  const open = (key: string) => { setForm(value[key] ?? {}); setEditing(key); };
  const commit = (connected: boolean) => {
    if (!editing) return;
    save.mutate({ ...value, [editing]: { ...form, connected } });
    setEditing(null);
  };

  const current = CATALOG.find((c) => c.key === editing);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATALOG.map((i) => {
          const Icon = i.icon;
          const conn = value[i.key]?.connected;
          return (
            <Card key={i.key}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{i.name}</div>
                      {conn && <Badge className="h-5 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Connected</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{i.cat}</div>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{i.desc}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant={conn ? "outline" : "default"} size="sm" disabled={isLoading} onClick={() => open(i.key)}>
                    {conn ? "Manage" : "Connect"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{current?.name}</DialogTitle>
            <DialogDescription>Credentials are stored against this company's settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API key / token</Label>
              <Input type="password" value={form.api_key ?? ""} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Endpoint / account</Label>
              <Input value={form.endpoint ?? ""} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            {value[editing ?? ""]?.connected && (
              <Button variant="outline" onClick={() => commit(false)}>Disconnect</Button>
            )}
            <Button onClick={() => commit(true)} disabled={save.isPending}>Save & connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
