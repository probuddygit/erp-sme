import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ListTree, Download, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/shared/components/StatCard";
import { StatusBadge } from "@/features/finance/components/StatusBadge";
import { formatINR, type AccountType } from "@/features/finance/data";
import { exportCsv, useFinanceBook } from "@/features/finance/api";

export const Route = createFileRoute("/_authenticated/workspace/finance/chart-of-accounts")({
  component: ChartOfAccountsPage,
});

const TYPE_TONES: Record<AccountType, string> = {
  asset: "bg-emerald-50 text-emerald-700 border-emerald-200",
  liability: "bg-rose-50 text-rose-700 border-rose-200",
  equity: "bg-violet-50 text-violet-700 border-violet-200",
  revenue: "bg-blue-50 text-blue-700 border-blue-200",
  expense: "bg-amber-50 text-amber-800 border-amber-200",
};

function ChartOfAccountsPage() {
  const book = useFinanceBook();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return book.accounts.filter((a) => !term || `${a.code} ${a.name} ${a.group}`.toLowerCase().includes(term));
  }, [book.accounts, q]);

  const byType = (t: AccountType) => book.accounts.filter((a) => a.type === t && !a.isGroup).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Assets" value={String(byType("asset"))} icon={ListTree} />
        <StatCard label="Liabilities" value={String(byType("liability"))} icon={ListTree} />
        <StatCard label="Equity" value={String(byType("equity"))} icon={ListTree} />
        <StatCard label="Revenue" value={String(byType("revenue"))} icon={ListTree} />
        <StatCard label="Expenses" value={String(byType("expense"))} icon={ListTree} />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="Search accounts by code, name or group…" />
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportCsv("chart-of-accounts.csv", rows.map((a) => ({
                  Code: a.code, Account: a.name, Type: a.type, Group: a.group, Balance: book.accountBalance(a.code),
                })))}
              >
                <Download className="mr-1.5 h-4 w-4" />Export
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Postings</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {book.isLoading ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Loading chart of accounts…</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No accounts match your search.</TableCell></TableRow>
                ) : rows.map((a) => {
                  const bal = a.isGroup ? 0 : book.accountBalance(a.code);
                  const postings = book.posted.reduce((s, e) => s + e.lines.filter((l) => l.accountCode === a.code).length, 0);
                  return (
                    <TableRow key={a.code}>
                      <TableCell className="font-mono text-xs">{a.code}</TableCell>
                      <TableCell>
                        <span className={a.isGroup ? "font-semibold" : ""} style={{ paddingLeft: a.parent ? 12 : 0 }}>{a.name}</span>
                      </TableCell>
                      <TableCell><StatusBadge label={a.type} tone={TYPE_TONES[a.type]} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.group}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{postings || "—"}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{a.isGroup ? "—" : formatINR(Math.abs(bal))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
