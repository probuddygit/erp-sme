import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataListPage, Pill } from "@/features/admin/DataListPage";
import { useAuditLogs, useUserNames, fmtTs } from "@/features/admin/logs-api";
import { exportRowsToCsv } from "@/features/admin/admin-api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/workspace/administration/audit-logs")({
  component: AuditPage,
});

function tone(action: string) {
  const a = action.toLowerCase();
  if (a.includes("create") || a.includes("insert")) return "success" as const;
  if (a.includes("delete") || a.includes("cancel")) return "danger" as const;
  if (a.includes("update")) return "info" as const;
  return "warn" as const;
}

function AuditPage() {
  const { company } = useAuth();
  const names = useUserNames();
  const { all, isLoading } = useAuditLogs({ limit: 500 });

  const changes = all
    .filter((r) => !r.action.toLowerCase().includes("delete"))
    .map((r) => ({
      id: r.id,
      ts: fmtTs(r.created_at),
      user: names[r.user_id ?? ""] ?? "System",
      entity: r.entity_id ? `${r.entity ?? "record"} · ${r.entity_id.slice(0, 8)}` : (r.entity ?? "—"),
      action: r.action,
      details: r.metadata ? JSON.stringify(r.metadata).slice(0, 120) : "—",
    }));

  const deleted = all
    .filter((r) => r.action.toLowerCase().includes("delete"))
    .map((r) => ({
      id: r.id,
      ts: fmtTs(r.created_at),
      user: names[r.user_id ?? ""] ?? "System",
      entity: r.entity_id ? `${r.entity ?? "record"} · ${r.entity_id.slice(0, 8)}` : (r.entity ?? "—"),
      reason: (r.metadata as any)?.reason ?? "—",
    }));

  const { data: approvals = [], isLoading: loadingApprovals } = useQuery({
    enabled: !!company?.id,
    queryKey: ["admin-approval-history", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approvals")
        .select("id, entity_type, entity_id, rule_name, status, amount, current_step, total_steps, updated_at, requested_by")
        .eq("company_id", company!.id)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const approvalRows = approvals.map((a: any) => ({
    id: a.id,
    ts: fmtTs(a.updated_at),
    entity: `${a.entity_type} · ${String(a.entity_id).slice(0, 8)}`,
    rule: a.rule_name ?? "—",
    step: `${a.current_step}/${a.total_steps}`,
    amount: a.amount != null ? `₹${Number(a.amount).toLocaleString("en-IN")}` : "—",
    status: a.status,
    requester: names[a.requested_by ?? ""] ?? "—",
  }));

  return (
    <Tabs defaultValue="changes" className="space-y-4">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="changes">Changes</TabsTrigger>
        <TabsTrigger value="deleted">Deleted Records</TabsTrigger>
        <TabsTrigger value="approval">Approval History</TabsTrigger>
      </TabsList>

      <TabsContent value="changes">
        <DataListPage
          rowActions={false}
          loading={isLoading}
          emptyLabel="No audit entries recorded yet"
          searchKeys={["entity", "user", "action"]}
          onExport={() => exportRowsToCsv("audit-changes", changes, [
            { key: "ts", header: "When" }, { key: "user", header: "User" },
            { key: "entity", header: "Entity" }, { key: "action", header: "Action" },
            { key: "details", header: "Details" },
          ])}
          columns={[
            { key: "ts", header: "When" },
            { key: "user", header: "User" },
            { key: "entity", header: "Entity" },
            { key: "action", header: "Action", render: (r: any) => <Pill tone={tone(r.action)}>{r.action}</Pill> },
            { key: "details", header: "Details" },
          ]}
          rows={changes as any}
        />
      </TabsContent>

      <TabsContent value="deleted">
        <DataListPage
          rowActions={false}
          loading={isLoading}
          emptyLabel="No deletions recorded"
          searchKeys={["entity", "user"]}
          onExport={() => exportRowsToCsv("audit-deleted", deleted, [
            { key: "ts", header: "Deleted at" }, { key: "user", header: "By" },
            { key: "entity", header: "Entity" }, { key: "reason", header: "Reason" },
          ])}
          columns={[
            { key: "ts", header: "Deleted at" },
            { key: "user", header: "By" },
            { key: "entity", header: "Entity" },
            { key: "reason", header: "Reason" },
          ]}
          rows={deleted as any}
        />
      </TabsContent>

      <TabsContent value="approval">
        <DataListPage
          rowActions={false}
          loading={loadingApprovals}
          emptyLabel="No approval requests yet"
          searchKeys={["entity", "rule", "requester"]}
          onExport={() => exportRowsToCsv("approval-history", approvalRows, [
            { key: "ts", header: "When" }, { key: "entity", header: "Document" },
            { key: "rule", header: "Rule" }, { key: "step", header: "Step" },
            { key: "amount", header: "Amount" }, { key: "status", header: "Status" },
          ])}
          columns={[
            { key: "ts", header: "When" },
            { key: "entity", header: "Document" },
            { key: "rule", header: "Rule" },
            { key: "step", header: "Step" },
            { key: "amount", header: "Amount" },
            { key: "requester", header: "Requested by" },
            { key: "status", header: "Status", render: (r: any) => (
              <Pill tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warn"}>{r.status}</Pill>
            ) },
          ]}
          rows={approvalRows as any}
        />
      </TabsContent>
    </Tabs>
  );
}
