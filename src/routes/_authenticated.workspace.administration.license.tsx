import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { SettingsForm } from "@/features/admin/SettingsForm";
import { useSettingsDoc } from "@/features/admin/admin-api";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/workspace/administration/license")({
  component: LicensePage,
});

function LicensePage() {
  const { company } = useAuth();
  const { value } = useSettingsDoc<Record<string, any>>("admin.license", {
    edition: "Enterprise", license_key: "", valid_till: "", seats: 0,
  });
  const valid = !value.valid_till || new Date(value.valid_till) >= new Date();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold">{value.edition || "Unlicensed"}</div>
              <Badge className={valid ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20" : "bg-amber-500/15 text-amber-600"}>
                {valid ? "Valid" : "Expired"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {value.license_key ? `License key ${value.license_key}` : "No license key recorded"}
              {company?.name ? ` · Issued to ${company.name}` : ""}
              {value.valid_till ? ` · Valid till ${value.valid_till}` : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      <SettingsForm settingsKey="admin.license" groups={[
        { title: "License", fields: [
          { name: "edition", label: "Edition", type: "select", default: "Enterprise", options: [
            { label: "Starter", value: "Starter" }, { label: "Professional", value: "Professional" }, { label: "Enterprise", value: "Enterprise" },
          ] },
          { name: "license_key", label: "License key", default: "" },
          { name: "valid_till", label: "Valid till", type: "date", default: "" },
          { name: "seats", label: "Licensed seats", type: "number", default: 0 },
        ] },
        { title: "Entitlements", fields: [
          { name: "modules_manufacturing", label: "Manufacturing", type: "switch", default: true },
          { name: "modules_maintenance", label: "Smart Maintenance", type: "switch", default: true },
          { name: "modules_bi", label: "Reports & BI", type: "switch", default: true },
          { name: "modules_api", label: "Open API access", type: "switch", default: true },
          { name: "support_tier", label: "Support tier", type: "select", default: "standard", options: [
            { label: "Standard", value: "standard" }, { label: "Priority", value: "priority" }, { label: "24x7", value: "24x7" },
          ] },
        ] },
      ]} />
    </div>
  );
}
