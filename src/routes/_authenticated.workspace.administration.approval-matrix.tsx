import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/approval-matrix")({
  component: ApprovalMatrix,
});

const cols = [
  { key: "name", header: "Rule" },
  { key: "trigger", header: "Trigger" },
  { key: "levels", header: "Levels" },
  { key: "approvers", header: "Approvers" },
  { key: "sla", header: "SLA" },
  { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Active" ? "success" : "warn"}>{r.status}</Pill> },
];

const set = (prefix: string, extra: any[] = []) => [
  { id: prefix + "1", name: `${prefix} – Standard`, trigger: "Amount > ₹50,000", levels: 2, approvers: "Manager, Head", sla: "24h", status: "Active" },
  { id: prefix + "2", name: `${prefix} – High Value`, trigger: "Amount > ₹5,00,000", levels: 3, approvers: "Manager, Head, CFO", sla: "48h", status: "Active" },
  { id: prefix + "3", name: `${prefix} – Exception`, trigger: "Discount > 15%", levels: 2, approvers: "Sales Head, MD", sla: "12h", status: "Draft" },
  ...extra,
];

function ApprovalMatrix() {
  return (
    <Tabs defaultValue="purchase" className="space-y-4">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="purchase">Purchase</TabsTrigger>
        <TabsTrigger value="sales">Sales</TabsTrigger>
        <TabsTrigger value="payment">Payment</TabsTrigger>
        <TabsTrigger value="expense">Expense</TabsTrigger>
        <TabsTrigger value="credit">Credit Limit</TabsTrigger>
        <TabsTrigger value="vendor">Vendor</TabsTrigger>
        <TabsTrigger value="customer">Customer</TabsTrigger>
      </TabsList>
      <TabsContent value="purchase"><DataListPage columns={cols as any} rows={set("Purchase") as any} searchKeys={["name"]} actionLabel="New rule" /></TabsContent>
      <TabsContent value="sales"><DataListPage columns={cols as any} rows={set("Sales") as any} searchKeys={["name"]} actionLabel="New rule" /></TabsContent>
      <TabsContent value="payment"><DataListPage columns={cols as any} rows={set("Payment") as any} searchKeys={["name"]} actionLabel="New rule" /></TabsContent>
      <TabsContent value="expense"><DataListPage columns={cols as any} rows={set("Expense") as any} searchKeys={["name"]} actionLabel="New rule" /></TabsContent>
      <TabsContent value="credit"><DataListPage columns={cols as any} rows={set("Credit") as any} searchKeys={["name"]} actionLabel="New rule" /></TabsContent>
      <TabsContent value="vendor"><DataListPage columns={cols as any} rows={set("Vendor") as any} searchKeys={["name"]} actionLabel="New rule" /></TabsContent>
      <TabsContent value="customer"><DataListPage columns={cols as any} rows={set("Customer") as any} searchKeys={["name"]} actionLabel="New rule" /></TabsContent>
    </Tabs>
  );
}