import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Building2, Upload } from "lucide-react";
import { SettingsSection, FieldRow, SettingsGrid } from "@/features/admin/SettingsShell";

export const Route = createFileRoute("/_authenticated/workspace/administration/organization")({
  component: OrgPage,
});

function OrgPage() {
  return (
    <Tabs defaultValue="profile" className="space-y-4">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="legal">Legal & Tax</TabsTrigger>
        <TabsTrigger value="regional">Regional</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="space-y-4">
        <SettingsGrid>
          <SettingsSection title="Organization" description="Legal identity of your enterprise">
            <FieldRow label="Name"><Input defaultValue="Ind Guru Enterprises Pvt Ltd" /></FieldRow>
            <FieldRow label="Short name"><Input defaultValue="Ind Guru" /></FieldRow>
            <FieldRow label="Industry">
              <Select defaultValue="mfg"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mfg">Manufacturing</SelectItem>
                  <SelectItem value="trade">Trading</SelectItem>
                  <SelectItem value="svc">Services</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Website"><Input placeholder="https://…" defaultValue="https://indguru.com" /></FieldRow>
          </SettingsSection>
          <SettingsSection title="Registered address">
            <FieldRow label="Address"><Textarea rows={3} defaultValue="Plot 42, MIDC, Pune" /></FieldRow>
            <FieldRow label="City"><Input defaultValue="Pune" /></FieldRow>
            <FieldRow label="State"><Input defaultValue="Maharashtra" /></FieldRow>
            <FieldRow label="Pincode"><Input defaultValue="411019" /></FieldRow>
          </SettingsSection>
        </SettingsGrid>
      </TabsContent>

      <TabsContent value="legal">
        <SettingsSection title="Statutory identifiers">
          <FieldRow label="GSTIN" hint="15-character GST number"><Input defaultValue="27AAACI1234H1ZV" /></FieldRow>
          <FieldRow label="PAN"><Input defaultValue="AAACI1234H" /></FieldRow>
          <FieldRow label="CIN"><Input defaultValue="U29100MH2015PTC000000" /></FieldRow>
          <FieldRow label="TAN"><Input defaultValue="PNEI12345A" /></FieldRow>
        </SettingsSection>
      </TabsContent>

      <TabsContent value="regional">
        <SettingsSection title="Regional settings">
          <FieldRow label="Country">
            <Select defaultValue="IN"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="IN">India</SelectItem></SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Timezone">
            <Select defaultValue="Asia/Kolkata"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem></SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Base currency"><Input defaultValue="INR" /></FieldRow>
          <FieldRow label="Language">
            <Select defaultValue="en"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Date format">
            <Select defaultValue="dmy"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dmy">DD-MM-YYYY</SelectItem>
                <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </SettingsSection>
      </TabsContent>

      <TabsContent value="branding">
        <SettingsSection title="Logo & brand">
          <FieldRow label="Logo" hint="PNG or SVG, up to 2MB">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-border bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <Button variant="outline"><Upload className="h-4 w-4 mr-1.5" />Upload</Button>
            </div>
          </FieldRow>
          <FieldRow label="Brand color"><Input type="color" defaultValue="#4f46e5" className="h-10 w-24 p-1" /></FieldRow>
        </SettingsSection>
      </TabsContent>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save changes</Button>
      </div>
    </Tabs>
  );
}