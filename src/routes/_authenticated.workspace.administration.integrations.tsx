import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Slack, MessageSquare, Cloud, CreditCard, Truck, FileSpreadsheet, Mail, Github, BarChart3, Boxes, Building } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/administration/integrations")({
  component: Integrations,
});

const INTEGRATIONS = [
  { name: "Tally", icon: FileSpreadsheet, cat: "Accounting", connected: true, desc: "Sync ledgers, vouchers and masters." },
  { name: "Razorpay", icon: CreditCard, cat: "Payments", connected: true, desc: "Payment links and settlements." },
  { name: "Stripe", icon: CreditCard, cat: "Payments", connected: false, desc: "International card payments." },
  { name: "Shiprocket", icon: Truck, cat: "Logistics", connected: false, desc: "Multi-carrier shipping." },
  { name: "Slack", icon: Slack, cat: "Communication", connected: true, desc: "Alerts and approvals in Slack." },
  { name: "Microsoft Teams", icon: MessageSquare, cat: "Communication", connected: false, desc: "Alerts in Teams channels." },
  { name: "Google Workspace", icon: Mail, cat: "Productivity", connected: true, desc: "SSO, Drive and Calendar." },
  { name: "AWS S3", icon: Cloud, cat: "Storage", connected: true, desc: "Document archival bucket." },
  { name: "GitHub", icon: Github, cat: "DevOps", connected: false, desc: "Ticket linking for IT." },
  { name: "Zoho Analytics", icon: BarChart3, cat: "BI", connected: false, desc: "External dashboards." },
  { name: "Zapier", icon: Zap, cat: "Automation", connected: true, desc: "5,000+ app automations." },
  { name: "SAP", icon: Building, cat: "ERP", connected: false, desc: "Master data federation." },
  { name: "Amazon Seller", icon: Boxes, cat: "Marketplaces", connected: false, desc: "Order and inventory sync." },
];

function Integrations() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {INTEGRATIONS.map((i) => {
        const Icon = i.icon;
        return (
          <Card key={i.name}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{i.name}</div>
                    {i.connected && <Badge className="h-5 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Connected</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{i.cat}</div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{i.desc}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant={i.connected ? "outline" : "default"} size="sm">{i.connected ? "Manage" : "Connect"}</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}