import { createFileRoute } from "@tanstack/react-router";
import { DataListPage, Pill } from "@/features/admin/DataListPage";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/workspace/administration/users")({
  component: () => (
    <DataListPage
      actionLabel="Invite user"
      searchKeys={["name", "email", "role"]}
      columns={[
        { key: "name", header: "User", render: (r: any) => (
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8"><AvatarFallback>{r.name.split(" ").map((n: string) => n[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.email}</div>
            </div>
          </div>
        )},
        { key: "role", header: "Role", render: (r: any) => <Pill tone="info">{r.role}</Pill> },
        { key: "branch", header: "Branch" },
        { key: "company", header: "Company" },
        { key: "last", header: "Last login" },
        { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Active" ? "success" : r.status === "Invited" ? "warn" : "danger"}>{r.status}</Pill> },
      ]}
      rows={[
        { id: "1", name: "Ops Admin", email: "ops@yopmail.com", role: "Super Admin", branch: "—", company: "—", last: "2 min ago", status: "Active" },
        { id: "2", name: "Sanna Guru", email: "sannag@yopmail.com", role: "Admin", branch: "BLR-01", company: "Guru Auto", last: "1 hour ago", status: "Active" },
        { id: "3", name: "Rahul Mehta", email: "rahul@indguru.com", role: "Finance", branch: "PNQ-HO", company: "Ind Guru", last: "3 hours ago", status: "Active" },
        { id: "4", name: "Priya Nair", email: "priya@indguru.com", role: "Sales", branch: "MAA-01", company: "John Auto", last: "Yesterday", status: "Active" },
        { id: "5", name: "Arjun Sharma", email: "arjun@indguru.com", role: "Purchase", branch: "PNQ-HO", company: "Ind Guru", last: "—", status: "Invited" },
        { id: "6", name: "Meera Iyer", email: "meera@indguru.com", role: "Warehouse", branch: "BLR-01", company: "Guru Auto", last: "3 days ago", status: "Inactive" },
      ] as any}
    />
  ),
});