import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/workspace/administration/permissions")({
  component: PermsPage,
});

const MODULES = ["Dashboard", "CRM", "Sales", "Procurement", "Inventory", "Finance", "GST", "Reports", "Workflow", "Administration"];
const ACTIONS = ["View", "Create", "Update", "Delete", "Approve", "Export"];

function Matrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Module</th>
            {ACTIONS.map((a) => <th key={a} className="px-4 py-2.5 text-center font-medium">{a}</th>)}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((m) => (
            <tr key={m} className="border-t border-border">
              <td className="px-4 py-2.5 font-medium">{m}</td>
              {ACTIONS.map((a) => (
                <td key={a} className="px-4 py-2.5 text-center">
                  <Checkbox defaultChecked={a === "View" || Math.random() > 0.4} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PermsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm text-muted-foreground">Role:</span>
          <Select defaultValue="admin">
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrator</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="plant">Plant Manager – Pune</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline">Reset</Button>
            <Button>Save permissions</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="module">
        <TabsList>
          <TabsTrigger value="module">Module</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="button">Button</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="field">Field Level</TabsTrigger>
          <TabsTrigger value="record">Record Level</TabsTrigger>
        </TabsList>
        <TabsContent value="module"><Card><CardContent className="p-0"><Matrix /></CardContent></Card></TabsContent>
        <TabsContent value="menu"><Card><CardContent className="p-6 text-sm text-muted-foreground">Toggle visibility of menu items per role. (dummy)</CardContent></Card></TabsContent>
        <TabsContent value="button"><Card><CardContent className="p-6 text-sm text-muted-foreground">Show/hide action buttons (Approve, Reject, Cancel, Print) per role. (dummy)</CardContent></Card></TabsContent>
        <TabsContent value="api"><Card><CardContent className="p-6 text-sm text-muted-foreground">REST endpoint access controls. (dummy)</CardContent></Card></TabsContent>
        <TabsContent value="field"><Card><CardContent className="p-6 text-sm text-muted-foreground">Mask or make read-only sensitive fields (Salary, Cost Price, PAN). (dummy)</CardContent></Card></TabsContent>
        <TabsContent value="record"><Card><CardContent className="p-6 text-sm text-muted-foreground">Row-level security by Branch, Warehouse, Owner, Territory. (dummy)</CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}