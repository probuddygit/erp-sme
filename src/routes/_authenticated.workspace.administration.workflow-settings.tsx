import { createFileRoute } from "@tanstack/react-router";
import { SettingsGrid, SettingsSection, FieldRow } from "@/features/admin/SettingsShell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/workspace/administration/workflow-settings")({
  component: () => (
    <div className="space-y-4">
      <SettingsGrid>
        <SettingsSection title="Defaults" description="Applied to all workflows unless overridden">
          <FieldRow label="Auto-escalate after"><Input defaultValue="48" /></FieldRow>
          <FieldRow label="Escalation unit">
            <Select defaultValue="hours"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Reminder cadence"><Input defaultValue="Every 12h until action" /></FieldRow>
          <FieldRow label="Skip absent approvers"><Switch defaultChecked /></FieldRow>
          <FieldRow label="Allow delegation"><Switch defaultChecked /></FieldRow>
        </SettingsSection>
        <SettingsSection title="Notifications" description="Channels used for workflow events">
          <FieldRow label="Email notifications"><Switch defaultChecked /></FieldRow>
          <FieldRow label="In-app"><Switch defaultChecked /></FieldRow>
          <FieldRow label="Push"><Switch /></FieldRow>
          <FieldRow label="SMS on escalation"><Switch /></FieldRow>
        </SettingsSection>
        <SettingsSection title="Comments & attachments">
          <FieldRow label="Require comment on reject"><Switch defaultChecked /></FieldRow>
          <FieldRow label="Allow attachments"><Switch defaultChecked /></FieldRow>
          <FieldRow label="Max attachment size"><Input defaultValue="10 MB" /></FieldRow>
        </SettingsSection>
        <SettingsSection title="History & audit">
          <FieldRow label="Retain workflow history"><Input defaultValue="7 years" /></FieldRow>
          <FieldRow label="Signed approvals"><Switch defaultChecked /></FieldRow>
        </SettingsSection>
      </SettingsGrid>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Reset defaults</Button>
        <Button>Save changes</Button>
      </div>
    </div>
  ),
});