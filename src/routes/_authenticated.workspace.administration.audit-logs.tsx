import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/audit-logs")({
  component: AuditPage,
});

function AuditPage() {
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
          actionLabel=""
          searchKeys={["entity", "user", "action"]}
          columns={[
            { key: "ts", header: "When" },
            { key: "user", header: "User" },
            { key: "entity", header: "Entity" },
            { key: "action", header: "Action", render: (r: any) => <Pill tone={r.action === "Create" ? "success" : r.action === "Update" ? "info" : "warn"}>{r.action}</Pill> },
            { key: "field", header: "Field" },
            { key: "before", header: "Before" },
            { key: "after", header: "After" },
          ]}
          rows={[
            { id: "1", ts: "25 Jul 10:12", user: "Rahul Mehta", entity: "Invoice INV/26-27/000240", action: "Update", field: "amount", before: "₹1,20,000", after: "₹1,25,000" },
            { id: "2", ts: "25 Jul 09:58", user: "Sanna Guru", entity: "Vendor V-0042", action: "Create", field: "—", before: "—", after: "New record" },
            { id: "3", ts: "24 Jul 18:04", user: "Priya Nair", entity: "SO/26-27/000511", action: "Update", field: "status", before: "Draft", after: "Approved" },
            { id: "4", ts: "24 Jul 15:22", user: "Arjun Sharma", entity: "PO/26-27/000305", action: "Cancel", field: "status", before: "Approved", after: "Cancelled" },
          ] as any}
        />
      </TabsContent>

      <TabsContent value="deleted">
        <DataListPage
          rowActions={false}
          searchKeys={["entity", "user"]}
          columns={[
            { key: "ts", header: "Deleted at" },
            { key: "user", header: "By" },
            { key: "entity", header: "Entity" },
            { key: "reason", header: "Reason" },
          ]}
          rows={[
            { id: "1", ts: "23 Jul 14:00", user: "Sanna Guru", entity: "Quotation QT/26-27/000187", reason: "Duplicate" },
            { id: "2", ts: "22 Jul 11:30", user: "Rahul Mehta", entity: "Journal JV/26-27/000390", reason: "Wrong FY" },
          ] as any}
        />
      </TabsContent>

      <TabsContent value="approval">
        <DataListPage
          rowActions={false}
          searchKeys={["entity", "approver"]}
          columns={[
            { key: "ts", header: "When" },
            { key: "entity", header: "Document" },
            { key: "approver", header: "Approver" },
            { key: "action", header: "Action", render: (r: any) => <Pill tone={r.action === "Approved" ? "success" : r.action === "Rejected" ? "danger" : "warn"}>{r.action}</Pill> },
            { key: "comment", header: "Comment" },
          ]}
          rows={[
            { id: "1", ts: "25 Jul 09:30", entity: "PO/26-27/000305", approver: "V. Ramesh", action: "Approved", comment: "OK" },
            { id: "2", ts: "24 Jul 17:15", entity: "Expense EXP-108", approver: "R. Mehta", action: "Rejected", comment: "Missing invoice" },
            { id: "3", ts: "24 Jul 12:00", entity: "SO/26-27/000508", approver: "P. Nair", action: "Approved", comment: "" },
          ] as any}
        />
      </TabsContent>
    </Tabs>
  );
}