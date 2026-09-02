import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Landmark, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/shared/components/StatCard";
import { formatINR } from "@/features/finance/data";
import { useAccounts } from "@/features/finance/api";
import {
  useBankAccounts, useSaveBankAccount, useDeleteBankAccount, type BankAccount,
} from "@/features/finance/banking-api";

export const Route = createFileRoute("/_authenticated/workspace/finance/bank-accounts")({
  component: BankAccountsPage,
  head: () => ({
    meta: [
      { title: "Bank Accounts | ProBuddy ERP" },
      { name: "description", content: "Maintain company bank accounts, opening balances and their linked ledger accounts." },
      { property: "og:title", content: "Bank Accounts | ProBuddy ERP" },
      { property: "og:description", content: "Maintain company bank accounts and linked ledger accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const EMPTY: Partial<BankAccount> = { name: "", account_type: "current", opening_balance: 0, is_active: true };

function BankAccountsPage() {
  const { data = [], isLoading } = useBankAccounts();
  const { data: accounts = [] } = useAccounts();
  const save = useSaveBankAccount();
  const del = useDeleteBankAccount();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<BankAccount> & { id?: string }>(EMPTY);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Bank accounts" value={String(data.length)} icon={Landmark} />
        <StatCard label="Active" value={String(data.filter((b) => b.is_active).length)} icon={Landmark} />
        <StatCard
          label="Opening balance"
          value={formatINR(data.reduce((s, b) => s + Number(b.opening_balance ?? 0), 0))}
          icon={Landmark}
        />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Bank accounts</h2>
            <Button size="sm" onClick={() => { setForm(EMPTY); setOpen(true); }}>
              <Plus className="mr-1.5 h-4 w-4" />New bank account
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account no.</TableHead>
                  <TableHead>IFSC</TableHead>
                  <TableHead>Ledger</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading bank accounts…</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No bank accounts yet. Add one to start importing statements.</TableCell></TableRow>
                ) : data.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.bank_name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{b.account_number ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{b.ifsc ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {accounts.find((a) => a.id === b.gl_account_id)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(Number(b.opening_balance ?? 0))}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setForm(b); setOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => del.mutate(b.id)}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit bank account" : "New bank account"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Name</Label>
              <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="HDFC Current — 1234" />
            </div>
            <div>
              <Label>Bank</Label>
              <Input value={form.bank_name ?? ""} onChange={(e) => set("bank_name", e.target.value)} />
            </div>
            <div>
              <Label>Branch</Label>
              <Input value={form.branch ?? ""} onChange={(e) => set("branch", e.target.value)} />
            </div>
            <div>
              <Label>Account number</Label>
              <Input value={form.account_number ?? ""} onChange={(e) => set("account_number", e.target.value)} />
            </div>
            <div>
              <Label>IFSC</Label>
              <Input value={form.ifsc ?? ""} onChange={(e) => set("ifsc", e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.account_type ?? "current"} onValueChange={(v) => set("account_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="od">Overdraft / CC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Opening balance</Label>
              <Input type="number" value={String(form.opening_balance ?? 0)} onChange={(e) => set("opening_balance", Number(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Linked ledger account</Label>
              <Select value={form.gl_account_id ?? ""} onValueChange={(v) => set("gl_account_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select cash/bank ledger" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter((a) => a.type === "asset" && !a.isGroup).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.name?.trim() || save.isPending}
              onClick={async () => { await save.mutateAsync(form); setOpen(false); }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
