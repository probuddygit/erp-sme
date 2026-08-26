import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  HardDriveDownload,
  History,
  Loader2,
  RefreshCw,
  Save,
  Server,
  Timer,
} from "lucide-react";
import {
  BACKUP_CATALOG,
  BACKUP_GROUPS,
  downloadBlob,
  toCsv,
  type BackupRunEntry,
} from "@/features/admin-platform/backup-catalog";
import {
  exportBackupTables,
  getBackupConfig,
  getBackupCounts,
  getBackupTenants,
  saveBackupConfig,
} from "@/features/admin-platform/backup.functions";

export const Route = createFileRoute("/_authenticated/admin/backup")({
  component: BackupCentre,
  head: () => ({
    meta: [
      { title: "Backup & Export Centre | Ind Guru ERP Operator" },
      {
        name: "description",
        content:
          "Operator-only backup and export centre: export tenant data to CSV or JSON, schedule automated backups, and review export history.",
      },
      { property: "og:title", content: "Backup & Export Centre | Ind Guru ERP Operator" },
      {
        property: "og:description",
        content: "Export tenant data, schedule backups, and audit every export run.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ALL = "__all__";

function BackupCentre() {
  const qc = useQueryClient();
  const fetchTenants = useServerFn(getBackupTenants);
  const fetchCounts = useServerFn(getBackupCounts);
  const runExport = useServerFn(exportBackupTables);
  const fetchConfig = useServerFn(getBackupConfig);
  const persistConfig = useServerFn(saveBackupConfig);

  const [tenant, setTenant] = useState<string>(ALL);
  const [selected, setSelected] = useState<string[]>([]);

  const tenants = useQuery({ queryKey: ["ops-backup-tenants"], queryFn: () => fetchTenants({}) });
  const companyId = tenant === ALL ? null : tenant;

  const counts = useQuery({
    queryKey: ["ops-backup-counts", companyId],
    queryFn: () => fetchCounts({ data: { companyId } }),
  });

  const settings = useQuery({ queryKey: ["ops-backup-config"], queryFn: () => fetchConfig({}) });

  const [form, setForm] = useState<Record<string, any> | null>(null);
  const config = form ?? settings.data?.config ?? null;
  const history: BackupRunEntry[] = settings.data?.history ?? [];

  const saveCfg = useMutation({
    mutationFn: (v: any) => persistConfig({ data: v }),
    onSuccess: () => {
      toast.success("Backup schedule saved");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["ops-backup-config"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  const exporting = useMutation({
    mutationFn: (v: { tables: string[]; format: "csv" | "json" }) =>
      runExport({ data: { tables: v.tables, companyId } }).then((r) => ({ ...r, format: v.format })),
    onSuccess: (res) => {
      const scope = companyId
        ? (tenants.data?.find((t) => t.id === companyId)?.slug ?? "tenant")
        : "all-tenants";
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const tables = Object.keys(res.data);
      if (res.format === "json" || tables.length > 1) {
        downloadBlob(
          `backup-${scope}-${stamp}.json`,
          JSON.stringify(res.data, null, 2),
          "application/json",
        );
      } else {
        const t = tables[0];
        downloadBlob(`${t}-${scope}-${stamp}.csv`, toCsv(res.data[t] ?? []), "text/csv");
      }
      toast.success(`Exported ${res.totalRows.toLocaleString("en-IN")} rows`);
      qc.invalidateQueries({ queryKey: ["ops-backup-config"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Export failed"),
  });

  const totalRows = useMemo(
    () => Object.values(counts.data ?? {}).reduce((s, n) => s + Math.max(0, n), 0),
    [counts.data],
  );
  const selectedRows = useMemo(
    () => selected.reduce((s, t) => s + Math.max(0, counts.data?.[t] ?? 0), 0),
    [selected, counts.data],
  );

  const toggle = (t: string) =>
    setSelected((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const toggleGroup = (g: string) => {
    const names = BACKUP_CATALOG.filter((t) => t.group === g).map((t) => t.table);
    const all = names.every((n) => selected.includes(n));
    setSelected((p) => (all ? p.filter((x) => !names.includes(x)) : [...new Set([...p, ...names])]));
  };

  const busy = exporting.isPending;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCardLite icon={Server} label="Tenants" value={String(tenants.data?.length ?? 0)} />
        <StatCardLite icon={Database} label="Exportable tables" value={String(BACKUP_CATALOG.length)} />
        <StatCardLite
          icon={HardDriveDownload}
          label="Rows in scope"
          value={counts.isLoading ? "…" : totalRows.toLocaleString("en-IN")}
        />
      </div>

      <Tabs defaultValue="export" className="space-y-4">
        <TabsList>
          <TabsTrigger value="export">
            <Download className="mr-1.5 h-4 w-4" /> Export
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Timer className="mr-1.5 h-4 w-4" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-1.5 h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 p-4">
              <div className="min-w-[220px]">
                <Label className="text-xs">Scope</Label>
                <Select
                  value={tenant}
                  onValueChange={(v) => {
                    setTenant(v);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All tenants</SelectItem>
                    {(tenants.data ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={() => counts.refetch()}
                disabled={counts.isFetching}
              >
                <RefreshCw className={`mr-1.5 h-4 w-4 ${counts.isFetching ? "animate-spin" : ""}`} />
                Refresh counts
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="secondary">
                  {selected.length} tables · {selectedRows.toLocaleString("en-IN")} rows
                </Badge>
                <Button
                  variant="outline"
                  disabled={!selected.length || busy}
                  onClick={() => exporting.mutate({ tables: selected, format: "csv" })}
                >
                  {busy ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                  )}
                  Export CSV
                </Button>
                <Button
                  disabled={!selected.length || busy}
                  onClick={() => exporting.mutate({ tables: selected, format: "json" })}
                >
                  {busy ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <FileJson className="mr-1.5 h-4 w-4" />
                  )}
                  Export JSON bundle
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {BACKUP_GROUPS.map((g) => {
              const items = BACKUP_CATALOG.filter((t) => t.group === g);
              return (
                <Card key={g}>
                  <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
                    <CardTitle className="text-sm">{g}</CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => toggleGroup(g)}>
                      Select all
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-1.5 pb-4">
                    {items.map((t) => (
                      <label
                        key={t.table}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <Checkbox
                          checked={selected.includes(t.table)}
                          onCheckedChange={() => toggle(t.table)}
                        />
                        <span className="flex-1 truncate">{t.label}</span>
                        {!t.tenantScoped && (
                          <Badge variant="outline" className="text-[10px]">
                            global
                          </Badge>
                        )}
                        <span className="tabular-nums text-xs text-muted-foreground">
                          {counts.isLoading
                            ? "…"
                            : (counts.data?.[t.table] ?? 0) < 0
                              ? "n/a"
                              : (counts.data?.[t.table] ?? 0).toLocaleString("en-IN")}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={busy}
                          onClick={(e) => {
                            e.preventDefault();
                            exporting.mutate({ tables: [t.table], format: "csv" });
                          }}
                          aria-label={`Export ${t.label}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </label>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Automated backups</CardTitle>
            </CardHeader>
            <CardContent className="grid max-w-3xl gap-4 sm:grid-cols-2">
              {!config ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-md border border-border p-3 sm:col-span-2">
                    <div>
                      <div className="text-sm font-medium">Enable scheduled backups</div>
                      <div className="text-xs text-muted-foreground">
                        Runs the selected scope on the configured cadence.
                      </div>
                    </div>
                    <Switch
                      checked={!!config.enabled}
                      onCheckedChange={(v) => setForm({ ...config, enabled: v })}
                    />
                  </div>
                  <Field label="Frequency">
                    <Select
                      value={config.frequency}
                      onValueChange={(v) => setForm({ ...config, frequency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["hourly", "daily", "weekly", "monthly"].map((f) => (
                          <SelectItem key={f} value={f}>
                            {f[0].toUpperCase() + f.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Run at (IST)">
                    <Input
                      value={config.time}
                      onChange={(e) => setForm({ ...config, time: e.target.value })}
                    />
                  </Field>
                  <Field label="Retention (days)">
                    <Input
                      type="number"
                      value={config.retention_days}
                      onChange={(e) =>
                        setForm({ ...config, retention_days: Number(e.target.value) || 1 })
                      }
                    />
                  </Field>
                  <Field label="Destination">
                    <Select
                      value={config.destination}
                      onValueChange={(v) => setForm({ ...config, destination: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="download">Manual download</SelectItem>
                        <SelectItem value="cloud">Managed cloud storage</SelectItem>
                        <SelectItem value="s3">Amazon S3</SelectItem>
                        <SelectItem value="gdrive">Google Drive</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Failure notification email">
                    <Input
                      type="email"
                      value={config.notify_email}
                      onChange={(e) => setForm({ ...config, notify_email: e.target.value })}
                    />
                  </Field>
                  <div className="flex items-center justify-between rounded-md border border-border p-3">
                    <div className="text-sm">Include platform tables</div>
                    <Switch
                      checked={!!config.include_platform_tables}
                      onCheckedChange={(v) => setForm({ ...config, include_platform_tables: v })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      disabled={saveCfg.isPending || !form}
                      onClick={() => saveCfg.mutate(config)}
                    >
                      {saveCfg.isPending ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-1.5 h-4 w-4" />
                      )}
                      Save schedule
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Tables</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        No exports yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(h.at).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{h.actor ?? "—"}</TableCell>
                      <TableCell>
                        {h.scope === "all-tenants"
                          ? "All tenants"
                          : (tenants.data?.find((t) => t.id === h.scope)?.name ?? h.scope)}
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground">
                        {h.tables.join(", ")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {h.rows.toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function StatCardLite({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
