import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/activity-logs")({
  component: ActivityLogs,
});

function ActivityLogs() {
  return (
    <Tabs defaultValue="login" className="space-y-4">
      <TabsList>
        <TabsTrigger value="login">Login History</TabsTrigger>
        <TabsTrigger value="activity">User Activity</TabsTrigger>
        <TabsTrigger value="api">API Logs</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <DataListPage rowActions={false} searchKeys={["user", "ip"]}
          columns={[
            { key: "ts", header: "Time" },
            { key: "user", header: "User" },
            { key: "ip", header: "IP" },
            { key: "device", header: "Device" },
            { key: "geo", header: "Location" },
            { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Success" ? "success" : "danger"}>{r.status}</Pill> },
          ]}
          rows={[
            { id: "1", ts: "25 Jul 09:41", user: "ops@yopmail.com", ip: "103.24.11.9", device: "Chrome / macOS", geo: "Pune, IN", status: "Success" },
            { id: "2", ts: "25 Jul 09:12", user: "sannag@yopmail.com", ip: "49.207.44.10", device: "Edge / Win 11", geo: "Bengaluru, IN", status: "Success" },
            { id: "3", ts: "25 Jul 08:57", user: "rahul@indguru.com", ip: "203.192.242.5", device: "Safari / iOS", geo: "Mumbai, IN", status: "Success" },
            { id: "4", ts: "24 Jul 22:18", user: "unknown", ip: "185.220.101.4", device: "curl/8.5", geo: "Frankfurt, DE", status: "Failed" },
          ] as any}
        />
      </TabsContent>
      <TabsContent value="activity">
        <DataListPage rowActions={false} searchKeys={["user", "action"]}
          columns={[
            { key: "ts", header: "Time" },
            { key: "user", header: "User" },
            { key: "action", header: "Action" },
            { key: "target", header: "Target" },
          ]}
          rows={[
            { id: "1", ts: "25 Jul 10:14", user: "Priya Nair", action: "Exported report", target: "Sales Register" },
            { id: "2", ts: "25 Jul 10:02", user: "Rahul Mehta", action: "Posted journal", target: "JV/26-27/000403" },
            { id: "3", ts: "25 Jul 09:56", user: "Ops Admin", action: "Reset password", target: "sannag@yopmail.com" },
          ] as any}
        />
      </TabsContent>
      <TabsContent value="api">
        <DataListPage rowActions={false} searchKeys={["endpoint", "client"]}
          columns={[
            { key: "ts", header: "Time" },
            { key: "method", header: "Method", render: (r: any) => <Pill tone="info">{r.method}</Pill> },
            { key: "endpoint", header: "Endpoint" },
            { key: "client", header: "Client" },
            { key: "status", header: "Status", render: (r: any) => <Pill tone={String(r.status).startsWith("2") ? "success" : String(r.status).startsWith("4") ? "warn" : "danger"}>{r.status}</Pill> },
            { key: "ms", header: "Latency" },
          ]}
          rows={[
            { id: "1", ts: "25 Jul 10:20", method: "GET", endpoint: "/api/v1/invoices", client: "Mobile app", status: "200", ms: "142 ms" },
            { id: "2", ts: "25 Jul 10:19", method: "POST", endpoint: "/api/v1/purchase-orders", client: "Zapier", status: "201", ms: "281 ms" },
            { id: "3", ts: "25 Jul 10:17", method: "GET", endpoint: "/api/v1/stock", client: "Warehouse app", status: "401", ms: "12 ms" },
          ] as any}
        />
      </TabsContent>
    </Tabs>
  );
}