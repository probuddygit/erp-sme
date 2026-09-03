import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/shared/components/StatCard";
import { formatINR } from "@/features/finance/data";
import { useAccounts, useJournalEntries } from "@/features/finance/api";
import { usePostVoucher, type VoucherLine } from "@/features/finance/banking-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspace/finance/vouchers")({
  component: VouchersPage,
  head: () => ({
    meta: [
      { title: "Expense & Journal Vouchers | ProBuddy ERP" },
      { name: "description", content: "Post balanced manual expense and journal vouchers straight into the double-entry ledger." },
      { property: "og:title", content: "Expense & Journal Vouchers | ProBuddy ERP" },
      { property: "og:description", content: "Post balanced manual vouchers into the ledger." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const blank = (): VoucherLine & { key: string } => ({
  key: Math.random().toString(36).slice(2), account_id: "", debit: 0, credit: 0, description: "",
});

function VouchersPage() {
  const { data: accounts = [] } = useAccounts();
  const { data: entries = [] } = useJournalEntries();
  const post = usePostVoucher();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState("journal");
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState([blank(), blank()]);

  const totalDr = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCr = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = Math.abs(totalDr - totalCr) < 0.01 && totalDr > 0;

  const setLine = (key: string, patch: Partial<VoucherLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const manual = entries.filter((e) => e.sourceModule === "finance");

  const submit = async () => {
    const payload = lines
      .filter((l) => l.account_id && (Number(l.debit) || Number(l.credit)))
      .map((l) => ({ account_id: l.account_id, debit: Number(l.debit || 0), credit: Number(l.credit || 0), description: l.description }));
    if (payload.length < 2) { toast.error("A voucher needs at least two lines"); return; }
    await post.mutateAsync({ date, narration: narration || "Manual voucher", kind, lines: payload });
    setLines([blank(), blank()]);
    setNarration("");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Manual vouchers" value={String(manual.length)} icon={BookOpen} />
        <StatCard label="Debit total" value={formatINR(totalDr)} icon={BookOpen} />
        <StatCard label="Credit total" value={formatINR(totalCr)} icon={BookOpen} />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">New voucher</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="journal">Journal voucher</SelectItem>
                  <SelectItem value="expense">Expense voucher</SelectItem>
                  <SelectItem value="contra">Contra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Narration</Label>
              <Textarea rows={1} value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Office rent for May" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-36 text-right">Debit</TableHead>
                  <TableHead className="w-36 text-right">Credit</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.key}>
                    <TableCell>
                      <Select value={l.account_id} onValueChange={(v) => setLine(l.key, { account_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                        <SelectContent>
                          {accounts.filter((a) => !a.isGroup).map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input value={l.description ?? ""} onChange={(e) => setLine(l.key, { description: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="text-right" value={String(l.debit ?? 0)}
                        onChange={(e) => setLine(l.key, { debit: Number(e.target.value), credit: 0 })} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="text-right" value={String(l.credit ?? 0)}
                        onChange={(e) => setLine(l.key, { credit: Number(e.target.value), debit: 0 })} />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, blank()])}>
              <Plus className="mr-1.5 h-4 w-4" />Add line
            </Button>
            <span className={`ml-auto text-xs ${balanced ? "text-emerald-600" : "text-muted-foreground"}`}>
              Debit {formatINR(totalDr)} · Credit {formatINR(totalCr)}
              {balanced ? " · balanced" : " · not balanced"}
            </span>
            <Button size="sm" disabled={!balanced || post.isPending} onClick={submit}>Post voucher</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Recent manual vouchers</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manual.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No manual vouchers posted yet.</TableCell></TableRow>
                ) : manual.slice(0, 15).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.number}</TableCell>
                    <TableCell className="text-xs">{e.date}</TableCell>
                    <TableCell>{e.narration}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(e.totalDebit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
