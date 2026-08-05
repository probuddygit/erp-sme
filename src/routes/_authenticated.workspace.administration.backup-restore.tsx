import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsForm } from "@/features/admin/SettingsForm";
import { DataListPage } from "@/features/admin/DataListPage";
import { exportRowsToCsv, useSettingsCollection, type CollectionRow } from "@/features/admin/admin-api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { fmtTs } from "@/features/admin/logs-api";
import { Download, Database } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspace/administration/backup-restore")({
  component: BackupPage,
});

const EXPORTABLE = [
  { table: "customers", label: "Customers" },
  { table: "suppliers", label: "Suppliers" },
  { table: "items", label: "Items" },
  { table: "invoices", label: "Sales invoices" },
  { table: "sales_orders", label: "Sales orders" },
  { table: "purchase_orders", label: "Purchase orders" },
  { table: "stock_transactions", label: "Stock transactions" },
  { table: "journal_entries", label: "Journal entries" },
  { table: "employees", label: "Employees" },
];

interface SnapshotRow extends CollectionRow { label: string; tables: string; rows: number; created_at: string }

function BackupPage() {
  const { company } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const snapshots = useSettingsCollection<SnapshotRow>("admin.backup.snapshots");

  const exportTable = async (table: string, label: string) => {
    if (!company?.id) return;
    setBusy(table);
    try {
      const { data, error } = await (supabase.from(table as never) as any)
        .select("*").eq("company_id", company.id).limit(5000);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      if (!rows.length) { toast.error(`No ${label.toLowerCase()} to export`); return; }
      const cols = Object.keys(rows[0]).map((k) => ({ key: k, header: k }));
      exportRowsToCsv(table, rows, cols);
      await snapshots.create({
        label, tables: table, rows: rows.length, created_at: new Date().toISOString(),
      } as any);
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const logRows = snapshots.rows.map((s) => ({
    id: s.id,
    label: s.label,
    tables: s.tables,
    rows: s.rows,
    created: fmtTs(s.created_at),
  }));

  return (
    <Tabs defaultValue="export" className="space-y-4">
      <TabsList>
        <TabsTrigger value="export">Data Export</TabsTrigger>
        <TabsTrigger value="schedule">Backup Schedule</TabsTrigger>
        <TabsTrigger value="history">Export History</TabsTrigger>
      </TabsList>

      <TabsContent value="export">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXPORTABLE.map((t) => (
            <Card key={t.table}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Database className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-xs text-muted-foreground">CSV export, current company only</div>
                </div>
                <Button size="sm" variant="outline" disabled={busy === t.table} onClick={() => exportTable(t.table, t.label)}>
                  <Download className="mr-1.5 h-4 w-4" />{busy === t.table ? "…" : "Export"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="schedule">
        <SettingsForm settingsKey="admin.backup.schedule" groups={[
          { title: "Automated backups", fields: [
            { name: "enabled", label: "Enabled", type: "switch", default: true },
            { name: "frequency", label: "Frequency", type: "select", default: "daily", options: [
              { label: "Hourly", value: "hourly" }, { label: "Daily", value: "daily" }, { label: "Weekly", value: "weekly" },
            ] },
            { name: "time", label: "Run at", default: "02:00 IST" },
            { name: "retention_days", label: "Retention (days)", type: "number", default: 30 },
          ] },
          { title: "Destination", fields: [
            { name: "destination", label: "Destination", type: "select", default: "cloud", options: [
              { label: "Managed cloud storage", value: "cloud" }, { label: "Amazon S3", value: "s3" }, { label: "Google Drive", value: "gdrive" },
            ] },
            { name: "bucket", label: "Bucket / folder", default: "" },
            { name: "encrypt", label: "Encrypt at rest", type: "switch", default: true },
            { name: "notify_email", label: "Notify on failure (email)", type: "email", default: "" },
          ] },
        ]} />
      </TabsContent>

      <TabsContent value="history">
        <DataListPage
          rowActions={false}
          loading={snapshots.isLoading}
          emptyLabel="No exports taken yet"
          searchKeys={["label", "tables"]}
          columns={[
            { key: "created", header: "When" },
            { key: "label", header: "Dataset" },
            { key: "tables", header: "Table" },
            { key: "rows", header: "Rows" },
          ]}
          rows={logRows as any}
        />
      </TabsContent>
    </Tabs>
  );
}
