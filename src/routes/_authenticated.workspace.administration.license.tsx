import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SettingsSection, FieldRow } from "@/features/admin/SettingsShell";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/administration/license")({
  component: () => (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold">Enterprise · Perpetual</div>
              <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Valid</Badge>
            </div>
            <div className="text-sm text-muted-foreground">License key IG-ENT-2026-8842-A9F0 · Issued to Ind Guru Enterprises Pvt Ltd</div>
          </div>
          <Button variant="outline">Update key</Button>
          <Button>Renew</Button>
        </CardContent>
      </Card>

      <SettingsSection title="Entitlements">
        <FieldRow label="Companies"><span className="text-sm">3 of 10 used</span></FieldRow>
        <FieldRow label="Users"><span className="text-sm">128 of 500 used</span></FieldRow>
        <FieldRow label="Branches"><span className="text-sm">6 of 25 used</span></FieldRow>
        <FieldRow label="Storage"><span className="text-sm">142 GB of 1 TB used</span></FieldRow>
        <FieldRow label="API requests / month"><span className="text-sm">1.2M of 10M used</span></FieldRow>
        <FieldRow label="Modules"><span className="text-sm">All modules enabled</span></FieldRow>
        <FieldRow label="Support"><span className="text-sm">24×7 Priority · SLA 4h</span></FieldRow>
        <FieldRow label="Valid until"><span className="text-sm">31 Mar 2028</span></FieldRow>
      </SettingsSection>
    </div>
  ),
});