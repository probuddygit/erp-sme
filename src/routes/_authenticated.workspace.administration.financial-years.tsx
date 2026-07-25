import { createFileRoute } from "@tanstack/react-router";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/financial-years")({
  component: () => (
    <DataListPage
      actionLabel="New financial year"
      searchKeys={["name"]}
      columns={[
        { key: "name", header: "Financial Year" },
        { key: "start", header: "Start" },
        { key: "end", header: "End" },
        { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Open" ? "success" : r.status === "Active" ? "info" : "warn"}>{r.status}</Pill> },
      ]}
      rows={[
        { id: "1", name: "FY 2026-27", start: "01 Apr 2026", end: "31 Mar 2027", status: "Active" },
        { id: "2", name: "FY 2025-26", start: "01 Apr 2025", end: "31 Mar 2026", status: "Open" },
        { id: "3", name: "FY 2024-25", start: "01 Apr 2024", end: "31 Mar 2025", status: "Locked" },
      ] as any}
    />
  ),
});