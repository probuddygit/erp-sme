import { createFileRoute } from "@tanstack/react-router";
import { SettingsGrid, SettingsSection, FieldRow } from "@/features/admin/SettingsShell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/workspace/administration/preferences")({
  component: () => (
    <div className="space-y-4">
      <SettingsGrid>
        <SettingsSection title="Appearance">
          <FieldRow label="Theme">
            <Select defaultValue="system"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">Follow system</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Compact density"><Switch /></FieldRow>
          <FieldRow label="High-contrast mode"><Switch /></FieldRow>
        </SettingsSection>

        <SettingsSection title="Regional format">
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
          <FieldRow label="Currency format">
            <Select defaultValue="lakh"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lakh">Indian (Lakh, Crore)</SelectItem>
                <SelectItem value="intl">International</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Timezone"><Input defaultValue="Asia/Kolkata (IST)" /></FieldRow>
        </SettingsSection>

        <SettingsSection title="Defaults">
          <FieldRow label="Landing page">
            <Select defaultValue="dashboard"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="reports">Reports</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Dashboard layout">
            <Select defaultValue="exec"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exec">Executive</SelectItem>
                <SelectItem value="ops">Operations</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Sidebar collapsed by default"><Switch /></FieldRow>
        </SettingsSection>

        <SettingsSection title="Notifications">
          <FieldRow label="Daily digest email"><Switch defaultChecked /></FieldRow>
          <FieldRow label="Mention alerts"><Switch defaultChecked /></FieldRow>
          <FieldRow label="Sound on new activity"><Switch /></FieldRow>
        </SettingsSection>
      </SettingsGrid>

      <div className="flex justify-end gap-2"><Button variant="outline">Reset</Button><Button>Save preferences</Button></div>
    </div>
  ),
});