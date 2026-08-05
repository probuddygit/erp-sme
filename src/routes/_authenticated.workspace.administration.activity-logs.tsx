import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataListPage, Pill } from "@/features/admin/DataListPage";
import { useAuditLogs, useUserNames, fmtTs } from "@/features/admin/logs-api";
import { exportRowsToCsv } from "@/features/admin/admin-api";

export const Route = createFileRoute("/_authenticated/workspace/administration/activity-logs")({
  component: ActivityLogs,
});

function ActivityLogs() {
  const names = useUserNames();
  const { all, isLoading } = useAuditLogs({ limit: 500 });

  const login = all
    .filter((r) => /login|sign_in|signin|auth|logout/i.test(r.action))
    .map((r) => ({
      id: r.id,
      ts: fmtTs(r.created_at),
      user: names[r.user_id ?? ""] ?? "—",
      ip: r.ip ?? "—",
      device: r.user_agent ? r.user_agent.slice(0, 60) : "—",
      status: /fail|denied|invalid/i.test(r.action) ? "Failed" : "Success",
    }));

  const activity = all
    .filter((r) => !/login|sign_in|signin|logout|^api/i.test(r.action))
    .map((r) => ({
      id: r.id,
      ts: fmtTs(r.created_at),
      user: names[r.user_id ?? ""] ?? "System",
      action: r.action,
      target: r.entity_id ? `${r.entity ?? "record"} · ${r.entity_id.slice(0, 8)}` : (r.entity ?? "—"),
    }));

  const api = all
    .filter((r) => /^api|endpoint|webhook/i.test(r.action) || r.entity === "api")
    .map((r) => ({
      id: r.id,
      ts: fmtTs(r.created_at),
      action: r.action,
      endpoint: (r.metadata as any)?.endpoint ?? r.entity ?? "—",
      client: (r.metadata as any)?.client ?? r.user_agent?.slice(0, 40) ?? "—",
      status: String((r.metadata as any)?.status ?? "200"),
    }));

  return (
    <Tabs defaultValue="login" className="space-y-4">
      <TabsList>
        <TabsTrigger value="login">Login History</TabsTrigger>
        <TabsTrigger value="activity">User Activity</TabsTrigger>
        <TabsTrigger value="api">API Logs</TabsTrigger>
      </TabsList>

      <TabsContent value="login">
        <DataListPage rowActions={false} loading={isLoading} searchKeys={["user", "ip"]}
          emptyLabel="No sign-in events recorded yet"
          onExport={() => exportRowsToCsv("login-history", login, [
            { key: "ts", header: "Time" }, { key: "user", header: "User" },
            { key: "ip", header: "IP" }, { key: "device", header: "Device" }, { key: "status", header: "Status" },
          ])}
          columns={[
            { key: "ts", header: "Time" },
            { key: "user", header: "User" },
            { key: "ip", header: "IP" },
            { key: "device", header: "Device" },
            { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Success" ? "success" : "danger"}>{r.status}</Pill> },
          ]}
          rows={login as any}
        />
      </TabsContent>

      <TabsContent value="activity">
        <DataListPage rowActions={false} loading={isLoading} searchKeys={["user", "action", "target"]}
          emptyLabel="No user activity recorded yet"
          onExport={() => exportRowsToCsv("user-activity", activity, [
            { key: "ts", header: "Time" }, { key: "user", header: "User" },
            { key: "action", header: "Action" }, { key: "target", header: "Target" },
          ])}
          columns={[
            { key: "ts", header: "Time" },
            { key: "user", header: "User" },
            { key: "action", header: "Action" },
            { key: "target", header: "Target" },
          ]}
          rows={activity as any}
        />
      </TabsContent>

      <TabsContent value="api">
        <DataListPage rowActions={false} loading={isLoading} searchKeys={["endpoint", "client"]}
          emptyLabel="No API calls recorded yet"
          onExport={() => exportRowsToCsv("api-logs", api, [
            { key: "ts", header: "Time" }, { key: "endpoint", header: "Endpoint" },
            { key: "client", header: "Client" }, { key: "status", header: "Status" },
          ])}
          columns={[
            { key: "ts", header: "Time" },
            { key: "action", header: "Action", render: (r: any) => <Pill tone="info">{r.action}</Pill> },
            { key: "endpoint", header: "Endpoint" },
            { key: "client", header: "Client" },
            { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status.startsWith("2") ? "success" : r.status.startsWith("4") ? "warn" : "danger"}>{r.status}</Pill> },
          ]}
          rows={api as any}
        />
      </TabsContent>
    </Tabs>
  );
}
