import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { TransferDialog } from "@/features/inventory/components/TransferDialog";
import { useStockTransactions, fmtINR, fmtDateTime } from "@/features/inventory/api";
import { STATUS_TONES } from "@/features/inventory/data";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/inventory/stock-transfer")({
  component: TransferPage,
});

interface Pair { id: string; date: string; item: string; from: string; to: string; qty: number; value: number; }

function TransferPage() {
  const { data: rows = [], isLoading } = useStockTransactions();
  const [open, setOpen] = useState(false);

  // Pair transfer_out + transfer_in by (item, close occurred_at, ~equal qty)
  const pairs = useMemo<Pair[]>(() => {
    const outs = rows.filter((r) => r.txn_type === "transfer_out");
    const ins = rows.filter((r) => r.txn_type === "transfer_in");
    return outs.map((o) => {
      const match = ins.find((i) => i.item?.sku === o.item?.sku && Math.abs(new Date(i.occurred_at).getTime() - new Date(o.occurred_at).getTime()) < 5000 && Math.abs(Number(i.quantity)) === Math.abs(Number(o.quantity)));
      return {
        id: o.id,
        date: o.occurred_at,
        item: o.item ? `${o.item.name} (${o.item.sku})` : "—",
        from: o.warehouse?.name ?? "—",
        to: match?.warehouse?.name ?? "—",
        qty: Math.abs(Number(o.quantity)),
        value: Math.abs(Number(o.total_value)),
      };
    });
  }, [rows]);

  const columns: Column<Pair>[] = [
    { header: "Date", cell: (r) => fmtDateTime(r.date) },
    { header: "Item", cell: (r) => <span className="font-medium">{r.item}</span> },
    { header: "From → To", cell: (r) => <div className="flex items-center gap-1 text-sm"><span>{r.from}</span><ArrowRight className="h-3 w-3 text-muted-foreground" /><span>{r.to}</span></div> },
    { header: "Qty",   align: "right", cell: (r) => r.qty },
    { header: "Value", align: "right", cell: (r) => fmtINR(r.value) },
    { header: "Status", cell: () => <StatusBadge label="posted" tone={STATUS_TONES.posted} /> },
  ];

  return (
    <>
      <InventoryTable<Pair>
        title="Stock Transfers" description="Move stock between warehouses (issue + receipt posted in one action)." icon={ArrowLeftRight}
        data={pairs} columns={columns} loading={isLoading}
        searchable={(r) => `${r.item} ${r.from} ${r.to}`}
        kpis={[
          { label: "Transfers", value: String(pairs.length) },
          { label: "Units moved", value: String(pairs.reduce((s, p) => s + p.qty, 0)) },
          { label: "Value moved", value: fmtINR(pairs.reduce((s, p) => s + p.value, 0)) },
          { label: "Warehouses", value: String(new Set([...pairs.map((p) => p.from), ...pairs.map((p) => p.to)]).size) },
        ]}
        newLabel="New Transfer"
        onNew={() => setOpen(true)}
      />
      <TransferDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
