import { createFileRoute } from "@tanstack/react-router";
import { SettingsGrid, SettingsSection, FieldRow } from "@/features/admin/SettingsShell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataListPage, Pill } from "@/features/admin/DataListPage";
import { Download, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/administration/backup-restore")({
  component: () => (
    <div className="space-y-4">
      <SettingsGrid>
        <SettingsSection title="Automatic backups">
          <FieldRow label="Enabled"><Switch defaultChecked /></FieldRow>
          <FieldRow label="Frequency">
            <Select defaultValue="daily"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Retention"><Input defaultValue="30 days" /></FieldRow>
          <FieldRow label="Encryption at rest"><Switch defaultChecked /></FieldRow>
        </SettingsSection>
        <SettingsSection title="Destination">
          <FieldRow label="Storage">
            <Select defaultValue="s3"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="s3">Amazon S3</SelectItem>
                <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                <SelectItem value="azure">Azure Blob</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Bucket"><Input defaultValue="indguru-erp-backups" /></FieldRow>
          <FieldRow label="Region"><Input defaultValue="ap-south-1" /></FieldRow>
        </SettingsSection>
      </SettingsGrid>

      <DataListPage rowActions={false} searchKeys={["name"]}
        actionLabel="Backup now"
        columns={[
          { key: "name", header: "Snapshot" },
          { key: "type", header: "Type", render: (r: any) => <Pill tone={r.type === "Auto" ? "info" : "default"}>{r.type}</Pill> },
          { key: "size", header: "Size" },
          { key: "created", header: "Created" },
          { key: "status", header: "Status", render: (r: any) => <Pill tone="success">{r.status}</Pill> },
          { key: "actions", header: "", render: () => (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5 mr-1" />Download</Button>
              <Button size="sm" variant="outline"><RotateCcw className="h-3.5 w-3.5 mr-1" />Restore</Button>
            </div>
          ), className: "text-right" },
        ]}
        rows={[
          { id: "1", name: "erp_2026-07-25_02-00", type: "Auto", size: "1.8 GB", created: "25 Jul 02:00", status: "Healthy" },
          { id: "2", name: "erp_2026-07-24_02-00", type: "Auto", size: "1.8 GB", created: "24 Jul 02:00", status: "Healthy" },
          { id: "3", name: "pre-migration-v1.4", type: "Manual", size: "1.7 GB", created: "20 Jul 18:30", status: "Healthy" },
          { id: "4", name: "erp_2026-07-23_02-00", type: "Auto", size: "1.8 GB", created: "23 Jul 02:00", status: "Healthy" },
        ] as any}
      />
    </div>
  ),
});