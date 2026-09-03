import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Upload, Link2, Undo2, Trash2, Scale, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatCard } from "@/shared/components/StatCard";
import { formatINR } from "@/features/finance/data";
import {
  useBankAccounts, useStatementLines, useImportStatement, useDeleteStatementLine,
  useMatchSuggestions, useReconcileLine, useUnreconcileLine, useReconciliationSummary,
  parseStatementCsv,
} from "@/features/finance/banking-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspace/finance/bank-reconciliation")({
  component: ReconciliationPage,
  head: () => ({
    meta: [
      { title: "Bank Reconciliation | ProBuddy ERP" },
      { name: "description", content: "Import bank statements, auto-match customer and vendor payments and reconcile balances." },
      { property: "og:title", content: "Bank Reconciliation | ProBuddy ERP" },
      { property: "og:description", content: "Import statements, match payments and reconcile bank balances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ReconciliationPage() {
  const { data: banks = [] } = useBankAccounts();
  const [bankId, setBankId] = useState<string>("");
  const activeBank = bankId || banks[0]?.id || "";
  const { data: lines = [], isLoading } = useStatementLines(activeBank || null);
  const { data: summary = [] } = useReconciliationSummary();
  const importer = useImportStatement();
  const delLine = useDeleteStatementLine();
  const reconcile = useReconcileLine();
  const unreconcile = useUnreconcileLine();
  const fileRef = useRef<HTMLInputElement>(null);
  const [matchLine, setMatchLine] = useState<string | null>(null);
  const { data: suggestions = [], isLoading: loadingSug } = useMatchSuggestions(matchLine);

  const summaryRow = useMemo(() => summary.find((s) => s.bank_account_id === activeBank), [summary, activeBank]);
  const unmatched = lines.filter((l) => l.match_status !== "reconciled").length;

  const onFile = async (file: File) => {
    if (!activeBank) { toast.error("Select a bank account first"); return; }
    const rows = parseStatementCsv(await file.text());
    if (!rows.length) { toast.error("No usable rows found in that CSV"); return; }
    await importer.mutateAsync({ bankAccountId: activeBank, rows });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Book balance" value={formatINR(Number(summaryRow?.book_balance ?? 0))} icon={Scale} />
        <StatCard label="Statement balance" value={formatINR(Number(summaryRow?.statement_balance ?? 0))} icon={Scale} />
        <StatCard label="Unreconciled lines" value={String(unmatched)} icon={AlertCircle} />
        <StatCard label="Unreconciled value" value={formatINR(Number(summaryRow?.unreconciled_amount ?? 0))} icon={AlertCircle} />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={activeBank} onValueChange={setBankId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select bank account" /></SelectTrigger>
              <SelectContent>
                {banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <input
              ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }}
            />
            <Button size="sm" variant="outline" disabled={!activeBank || importer.isPending} onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" />Import statement (CSV)
            </Button>
            <span className="text-xs text-muted-foreground">
              Columns: date, description, reference, deposit, withdrawal, balance
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Deposit</TableHead>
                  <TableHead className="text-right">Withdrawal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading statement…</TableCell></TableRow>
                ) : lines.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No statement lines. Import a CSV to begin.</TableCell></TableRow>
                ) : lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">{l.txn_date}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{l.description ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{l.reference ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(l.deposit) ? formatINR(Number(l.deposit)) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(l.withdrawal) ? formatINR(Number(l.withdrawal)) : "—"}</TableCell>
                    <TableCell>
                      {l.match_status === "reconciled" ? (
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" />Reconciled
                        </Badge>
                      ) : (
                        <Badge variant="outline">Unmatched</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {l.match_status === "reconciled" ? (
                          <Button size="icon" variant="ghost" title="Undo reconciliation" onClick={() => unreconcile.mutate(l.id)}>
                            <Undo2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" title="Find match" onClick={() => setMatchLine(l.id)}>
                            <Link2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" title="Delete line" onClick={() => delLine.mutate(l.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!matchLine} onOpenChange={(o) => !o && setMatchLine(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Suggested matches</DialogTitle></DialogHeader>
          {loadingSug ? (
            <p className="text-sm text-muted-foreground">Looking for matching payments…</p>
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unreconciled payment found near this date.</p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s) => (
                <div key={s.doc_id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.party} · {s.doc_number ?? "Payment"}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.doc_date} · {s.doc_kind === "customer_payment" ? "Customer receipt" : "Vendor payment"} · match score {s.score}
                    </div>
                  </div>
                  <div className="tabular-nums text-sm font-medium">{formatINR(Number(s.amount))}</div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await reconcile.mutateAsync({ lineId: matchLine!, docKind: s.doc_kind, docId: s.doc_id });
                      setMatchLine(null);
                    }}
                  >
                    Reconcile
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
