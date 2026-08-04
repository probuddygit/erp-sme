import { createFileRoute } from "@tanstack/react-router";
import { CrudList } from "@/features/admin/CrudList";
import { Pill } from "@/features/admin/DataListPage";
import { useCompanyTable } from "@/features/admin/admin-api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock, Unlock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/administration/financial-years")({
  component: FinancialYearsPage,
});

interface FY {
  id: string; name: string; start_date: string; end_date: string; is_active: boolean; is_closed: boolean;
}

const fmt = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function FinancialYearsPage() {
  const { rows, isLoading, create, update, remove } = useCompanyTable<FY>("financial_years", { orderBy: "start_date", ascending: false });

  const activate = async (row: FY) => {
    await Promise.all(rows.filter((r) => r.is_active && r.id !== row.id).map((r) => update.mutateAsync({ id: r.id, is_active: false })));
    await update.mutateAsync({ id: row.id, is_active: true });
  };

  return (
    <CrudList<FY>
      entity="Financial year"
      actionLabel="New financial year"
      loading={isLoading}
      rows={rows}
      searchKeys={["name"]}
      columns={[
        { key: "name", header: "Financial year" },
        { key: "start_date", header: "Start", render: (r) => fmt(r.start_date) },
        { key: "end_date", header: "End", render: (r) => fmt(r.end_date) },
        {
          key: "status", header: "Status",
          render: (r) => r.is_closed
            ? <Pill tone="warn">Locked</Pill>
            : r.is_active ? <Pill tone="info">Active</Pill> : <Pill tone="success">Open</Pill>,
        },
      ]}
      fields={[
        { name: "name", label: "Name", required: true, placeholder: "FY 2026-27" },
        { name: "start_date", label: "Start date", type: "date", required: true },
        { name: "end_date", label: "End date", type: "date", required: true },
        { name: "is_active", label: "Active", type: "switch" },
        { name: "is_closed", label: "Locked", type: "switch" },
      ]}
      rowExtra={(r) => (
        <>
          {!r.is_active && !r.is_closed && (
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Set active" onClick={() => activate(r)}>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            title={r.is_closed ? "Unlock year" : "Lock year"}
            onClick={() => update.mutateAsync({ id: r.id, is_closed: !r.is_closed })}
          >
            {r.is_closed ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          </Button>
        </>
      )}
      onCreate={(v) => create.mutateAsync(v)}
      onUpdate={(id, v) => update.mutateAsync({ id, ...v })}
      onDelete={(r) => remove.mutateAsync(r.id)}
    />
  );
}
