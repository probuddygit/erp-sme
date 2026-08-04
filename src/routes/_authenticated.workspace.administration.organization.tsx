import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { SettingsSection, FieldRow, SettingsGrid } from "@/features/admin/SettingsShell";
import { SettingsForm } from "@/features/admin/SettingsForm";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspace/administration/organization")({
  component: OrgPage,
});

function CompanyProfileTab() {
  const { company, organization, refresh } = useAuth();
  const [form, setForm] = useState<Record<string, any> | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (company && loadedId !== company.id) {
    setLoadedId(company.id);
    supabase.from("companies").select("*").eq("id", company.id).maybeSingle().then(({ data }) => setForm(data ?? {}));
  }
  const f = form ?? {};
  const set = (k: string, v: any) => setForm({ ...f, [k]: v });

  const save = async () => {
    if (!company?.id) return;
    setBusy(true);
    const { error } = await supabase.from("companies").update({
      name: f.name, legal_name: f.legal_name, gstin: f.gstin, pan: f.pan,
      state_code: f.state_code, currency: f.currency, address: f.address,
    }).eq("id", company.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Organization profile saved");
  };

  return (
    <div className="space-y-4">
      <SettingsGrid>
        <SettingsSection title="Organization" description={organization ? `Part of ${organization.name}` : "Legal identity of your enterprise"}>
          <FieldRow label="Company name"><Input value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} /></FieldRow>
          <FieldRow label="Legal name"><Input value={f.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} /></FieldRow>
          <FieldRow label="Base currency"><Input value={f.currency ?? ""} onChange={(e) => set("currency", e.target.value)} /></FieldRow>
        </SettingsSection>
        <SettingsSection title="Statutory & address">
          <FieldRow label="GSTIN" hint="15-character GST number"><Input value={f.gstin ?? ""} onChange={(e) => set("gstin", e.target.value)} /></FieldRow>
          <FieldRow label="PAN"><Input value={f.pan ?? ""} onChange={(e) => set("pan", e.target.value)} /></FieldRow>
          <FieldRow label="State code"><Input value={f.state_code ?? ""} onChange={(e) => set("state_code", e.target.value)} /></FieldRow>
          <FieldRow label="Registered address"><Textarea rows={3} value={f.address ?? ""} onChange={(e) => set("address", e.target.value)} /></FieldRow>
        </SettingsSection>
      </SettingsGrid>
      <div className="flex justify-end">
        <Button onClick={save} disabled={busy}><Save className="mr-1.5 h-4 w-4" />{busy ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
  );
}

function OrgPage() {
  return (
    <Tabs defaultValue="profile" className="space-y-4">
      <TabsList>
        <TabsTrigger value="profile">Profile & Legal</TabsTrigger>
        <TabsTrigger value="regional">Regional</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
      </TabsList>

      <TabsContent value="profile"><CompanyProfileTab /></TabsContent>

      <TabsContent value="regional">
        <SettingsForm
          settingsKey="admin.regional"
          groups={[{
            title: "Regional settings",
            description: "Applies to formatting across documents and reports",
            fields: [
              { name: "country", label: "Country", type: "select", default: "IN", options: [{ label: "India", value: "IN" }] },
              { name: "timezone", label: "Timezone", type: "select", default: "Asia/Kolkata", options: [{ label: "Asia/Kolkata (IST)", value: "Asia/Kolkata" }] },
              { name: "language", label: "Language", type: "select", default: "en", options: [{ label: "English", value: "en" }, { label: "हिन्दी", value: "hi" }] },
              { name: "date_format", label: "Date format", type: "select", default: "dmy", options: [{ label: "DD-MM-YYYY", value: "dmy" }, { label: "MM/DD/YYYY", value: "mdy" }, { label: "YYYY-MM-DD", value: "ymd" }] },
              { name: "number_format", label: "Number format", type: "select", default: "in", options: [{ label: "Indian (1,23,456)", value: "in" }, { label: "International (123,456)", value: "intl" }] },
              { name: "fy_start_month", label: "FY start month", type: "select", default: "4", options: [{ label: "April", value: "4" }, { label: "January", value: "1" }] },
            ],
          }]}
          columns={1}
        />
      </TabsContent>

      <TabsContent value="branding">
        <SettingsForm
          settingsKey="admin.branding"
          groups={[{
            title: "Logo & brand",
            description: "Used on printed documents such as quotations and invoices",
            fields: [
              { name: "logo_url", label: "Logo URL", hint: "Public https URL of a PNG or SVG" },
              { name: "primary_color", label: "Brand colour", default: "#2563eb" },
              { name: "invoice_footer", label: "Document footer", type: "textarea" },
              { name: "email_signature", label: "Email signature", type: "textarea" },
            ],
          }]}
          columns={1}
        />
      </TabsContent>
    </Tabs>
  );
}
