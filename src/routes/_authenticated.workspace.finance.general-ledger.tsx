import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportCard } from "@/features/finance/components/ReportCard";
import { StatCard } from "@/shared/components/StatCard";
import { BookOpenCheck, IndianRupee } from "lucide-react";
import { formatDate, formatINR, formatINRSigned } from "@/features/finance/data";
import { useFinanceBook } from "@/features/finance/api";

export const Route = createFileRoute("/_authenticated/workspace/finance/general-ledger")({
  component: GeneralLedgerPage,
});

function GeneralLedgerPage() {
  const book = useFinanceBook();
  const accounts = book.accounts.filter((a) => !a.isGroup);
  const [account, setAccount] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!account && accounts.length) setAccount(accounts[0].code);
  }, [accounts, account]);

  const ledger = useMemo(() => book.computeLedger(account), [book, account]);
  const rows = useMemo(
    () => ledger.rows.filter((r) => (!from || r.date >= from) && (!to || r.date <= to)),
    [ledger.rows, from, to],
  );
  const totals = rows.reduce((acc, r) => ({ d: acc.d + r.debit, c: acc.c + r.credit }), { d: 0, c: 0 });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Opening" value={formatINRSigned(ledger.opening)} icon={BookOpenCheck} />
        <StatCard label="Debits" value={formatINR(totals.d)} icon={IndianRupee} />
        <StatCard label="Credits" value={formatINR(totals.c)} icon={IndianRupee} />
        <StatCard label="Closing" value={formatINRSigned(ledger.closing)} icon={BookOpenCheck} />
      </div>

      <ReportCard
        title="General Ledger"
        subtitle="Chronological postings for a selected account with running balance."
        filters={
          <>
            <div className="min-w-[240px]">
              <label className="mb-1 block text-[10.5px] uppercase tracking-wider text-muted-foreground">Account</label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {accounts.map((a) => (
                    <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] uppercase tracking-wider text-muted-foreground">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] uppercase tracking-wider text-muted-foreground">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        }
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Voucher</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/30">
                <TableCell colSpan={6} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opening balance</TableCell>
                <TableCell className="text-right font-semibold">{formatINRSigned(ledger.opening)}</TableCell>
              </TableRow>
              {book.isLoading ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading postings…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No postings in this period.</TableCell></TableRow>
              ) : rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.date)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.number}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.reference ?? "—"}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-sm">{r.narration}</TableCell>
                  <TableCell className="text-right">{r.debit ? formatINR(r.debit) : "—"}</TableCell>
                  <TableCell className="text-right">{r.credit ? formatINR(r.credit) : "—"}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatINRSigned(r.running)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={4} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Totals</TableCell>
                <TableCell className="text-right font-semibold">{formatINR(totals.d)}</TableCell>
                <TableCell className="text-right font-semibold">{formatINR(totals.c)}</TableCell>
                <TableCell className="text-right font-semibold">{formatINRSigned(ledger.closing)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </ReportCard>
    </div>
  );
}
