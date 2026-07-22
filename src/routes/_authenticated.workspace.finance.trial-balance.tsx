import { createFileRoute } from "@tanstack/react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportCard } from "@/features/finance/components/ReportCard";
import { StatCard } from "@/shared/components/StatCard";
import { Scale } from "lucide-react";
import { computeTrialBalance, formatINR } from "@/features/finance/data";
import { StatusBadge } from "@/features/finance/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/workspace/finance/trial-balance")({
  component: TrialBalancePage,
});

function TrialBalancePage() {
  const rows = computeTrialBalance();
  const debitTotal = rows.reduce((s, r) => s + r.debit, 0);
  const creditTotal = rows.reduce((s, r) => s + r.credit, 0);
  const balanced = Math.round(debitTotal - creditTotal) === 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total debits" value={formatINR(debitTotal)} icon={Scale} />
        <StatCard label="Total credits" value={formatINR(creditTotal)} icon={Scale} />
        <StatCard label="Difference" value={formatINR(Math.abs(debitTotal - creditTotal))} icon={Scale} hint={balanced ? "Books are balanced" : "Investigate variance"} />
      </div>

      <ReportCard
        title="Trial Balance"
        subtitle="All ledger accounts with their debit and credit balances."
        actions={<StatusBadge label={balanced ? "Balanced" : "Out of balance"} tone={balanced ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"} />}
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.code}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-xs capitalize text-muted-foreground">{r.type}</TableCell>
                  <TableCell className="text-right">{r.debit ? formatINR(r.debit) : "—"}</TableCell>
                  <TableCell className="text-right">{r.credit ? formatINR(r.credit) : "—"}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={3} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</TableCell>
                <TableCell className="text-right font-semibold">{formatINR(debitTotal)}</TableCell>
                <TableCell className="text-right font-semibold">{formatINR(creditTotal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </ReportCard>
    </div>
  );
}