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
        { key: "base", header: "", render: (r: any) => r.base ? <Pill tone="info">Base</Pill> : null },
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