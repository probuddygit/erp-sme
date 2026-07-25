import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getSystemHealth,
  listPlatformAuditLogs,
} from "@/features/admin-platform/admin-platform.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, Users, Building2, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/system")({
  component: SystemPage,
});

function SystemPage() {
  const fetchHealth = useServerFn(getSystemHealth);
  const fetchAudit = useServerFn(listPlatformAuditLogs);

  const [health, setHealth] = useState<Awaited<ReturnType<typeof getSystemHealth>> | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [h, l] = await Promise.all([fetchHealth(), fetchAudit({ data: { limit: 50 } })]);
      setHealth(h);
      setLogs(l);
    } catch (e: any) {
      toast.error(e.message || "Failed to load system data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Total Users</div>
            <div className="mt-2 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{health?.totalUsers ?? 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Total Companies</div>
            <div className="mt-2 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{health?.totalCompanies ?? 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Active Companies</div>
            <div className="mt-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <div className="text-2xl font-bold">{health?.activeCompanies ?? 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Logins (24h)</div>
            <div className="mt-2 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{health?.logins24h ?? 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Platform Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No audit logs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell>{log.users?.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{log.entity}</TableCell>
                      <TableCell className="font-mono text-xs">{log.entity_id ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
