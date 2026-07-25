import { createFileRoute } from "@tanstack/react-router";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/companies")({
  component: () => (
    <DataListPage
      actionLabel="New company"
      searchKeys={["name", "gstin", "state"]}
      columns={[
        { key: "name", header: "Company" },
        { key: "gstin", header: "GSTIN" },
        { key: "state", header: "State" },
        { key: "plan", header: "Plan", render: (r) => <Pill tone="info">{r.plan}</Pill> },
        { key: "status", header: "Status", render: (r) => <Pill tone={r.status === "Active" ? "success" : "warn"}>{r.status}</Pill> },
      ]}
      rows={[
        { id: "1", name: "Ind Guru Enterprises", gstin: "27AAACI1234H1ZV", state: "Maharashtra", plan: "Enterprise", status: "Active" },
        { id: "2", name: "Guru Auto", gstin: "29AAACG5678K1Z9", state: "Karnataka", plan: "Pro", status: "Active" },
        { id: "3", name: "John Auto Components", gstin: "33AAACJ9012L1ZQ", state: "Tamil Nadu", plan: "Starter", status: "Active" },
      ] as any}
    />
  ),
});
*** Add File: src/routes/_authenticated.workspace.administration.branches.tsx
import { createFileRoute } from "@tanstack/react-router";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/branches")({
  component: () => (
    <DataListPage
      actionLabel="New branch"
      searchKeys={["name", "code", "city"]}
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Branch" },
        { key: "company", header: "Company" },
        { key: "city", header: "City" },
        { key: "gstin", header: "GSTIN" },
        { key: "warehouses", header: "Warehouses" },
        { key: "users", header: "Users" },
        { key: "flag", header: "", render: (r) => r.head ? <Pill tone="info">Head office</Pill> : null },
      ]}
      rows={[
        { id: "1", code: "PNQ-HO", name: "Pune Head Office", company: "Ind Guru", city: "Pune", gstin: "27AAACI1234H1ZV", warehouses: 3, users: 42, head: true },
        { id: "2", code: "BLR-01", name: "Bengaluru Plant", company: "Guru Auto", city: "Bengaluru", gstin: "29AAACG5678K1Z9", warehouses: 2, users: 28, head: false },
        { id: "3", code: "MAA-01", name: "Chennai Branch", company: "John Auto", city: "Chennai", gstin: "33AAACJ9012L1ZQ", warehouses: 1, users: 14, head: false },
      ] as any}
    />
  ),
});
*** Add File: src/routes/_authenticated.workspace.administration.financial-years.tsx
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
        { key: "status", header: "Status", render: (r) => <Pill tone={r.status === "Open" ? "success" : r.status === "Active" ? "info" : "warn"}>{r.status}</Pill> },
      ]}
      rows={[
        { id: "1", name: "FY 2026-27", start: "01 Apr 2026", end: "31 Mar 2027", status: "Active" },
        { id: "2", name: "FY 2025-26", start: "01 Apr 2025", end: "31 Mar 2026", status: "Open" },
        { id: "3", name: "FY 2024-25", start: "01 Apr 2024", end: "31 Mar 2025", status: "Locked" },
      ] as any}
    />
  ),
});
*** Add File: src/routes/_authenticated.workspace.administration.currencies.tsx
import { createFileRoute } from "@tanstack/react-router";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/currencies")({
  component: () => (
    <DataListPage
      actionLabel="Add currency"
      searchKeys={["code", "name"]}
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "symbol", header: "Symbol" },
        { key: "rate", header: "Rate (INR)" },
        { key: "base", header: "", render: (r) => r.base ? <Pill tone="info">Base</Pill> : null },
      ]}
      rows={[
        { id: "1", code: "INR", name: "Indian Rupee", symbol: "₹", rate: "1.0000", base: true },
        { id: "2", code: "USD", name: "US Dollar", symbol: "$", rate: "83.42", base: false },
        { id: "3", code: "EUR", name: "Euro", symbol: "€", rate: "90.11", base: false },
        { id: "4", code: "GBP", name: "British Pound", symbol: "£", rate: "105.32", base: false },
        { id: "5", code: "AED", name: "UAE Dirham", symbol: "د.إ", rate: "22.71", base: false },
      ] as any}
    />
  ),
});