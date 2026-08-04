import { createFileRoute } from "@tanstack/react-router";
import { CrudList } from "@/features/admin/CrudList";
import { Pill } from "@/features/admin/DataListPage";
import { useCompanyTable } from "@/features/admin/admin-api";

export const Route = createFileRoute("/_authenticated/workspace/administration/currencies")({
  component: CurrenciesPage,
});

interface Currency {
  id: string; code: string; name: string; symbol: string | null;
  exchange_rate: number; is_base: boolean; is_active: boolean;
}

function CurrenciesPage() {
  const { rows, isLoading, create, update, remove } = useCompanyTable<Currency>("currencies", { orderBy: "code" });

  return (
    <CrudList<Currency>
      entity="Currency"
      actionLabel="Add currency"
      loading={isLoading}
      rows={rows}
      searchKeys={["code", "name"]}
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "symbol", header: "Symbol" },
        { key: "exchange_rate", header: "Rate (base)", render: (r) => Number(r.exchange_rate ?? 0).toFixed(4) },
        { key: "is_base", header: "", render: (r) => r.is_base ? <Pill tone="info">Base</Pill> : null },
        { key: "is_active", header: "Status", render: (r) => <Pill tone={r.is_active ? "success" : "warn"}>{r.is_active ? "Active" : "Inactive"}</Pill> },
      ]}
      fields={[
        { name: "code", label: "Code", required: true, placeholder: "USD" },
        { name: "name", label: "Name", required: true },
        { name: "symbol", label: "Symbol", placeholder: "$" },
        { name: "exchange_rate", label: "Exchange rate", type: "number", default: 1 },
        { name: "is_base", label: "Base currency", type: "switch" },
        { name: "is_active", label: "Active", type: "switch", default: true },
      ]}
      onCreate={(v) => create.mutateAsync({ ...v, code: String(v.code).toUpperCase(), exchange_rate: Number(v.exchange_rate) || 1 })}
      onUpdate={(id, v) => update.mutateAsync({ id, ...v, code: String(v.code).toUpperCase(), exchange_rate: Number(v.exchange_rate) || 1 })}
      onDelete={(r) => remove.mutateAsync(r.id)}
    />
  );
}
