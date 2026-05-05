import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/finance/accounts")({
  component: AccountsPage,
});

function AccountsPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("finance");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(""); const [name, setName] = useState(""); const [type, setType] = useState("expense");

  const { data: accounts } = useQuery({
    enabled: !!company?.id,
    queryKey: ["coa-balances", company?.id],
    queryFn: async () => (await supabase.rpc("account_balances", { _company_id: company!.id })).data ?? [],
  });

  const submit = async () => {
    if (!code || !name) { toast.error("Code and name required"); return; }
    const { error } = await supabase.from("chart_of_accounts").insert({
      company_id: company!.id, code, name, type: type as any, is_system: false,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Account added");
    setOpen(false); setCode(""); setName(""); setType("expense");
    qc.invalidateQueries({ queryKey: ["coa-balances"] });
  };

  const grouped = (accounts ?? []).reduce<Record<string, any[]>>((acc: Record<string, any[]>, r: any) => {
    (acc[r.type] = acc[r.type] || []).push(r); return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Chart of Accounts</h2>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New account</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add account</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Code *</Label><Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. 5300" /></div>
                <div><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                <div><Label>Type *</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {["asset","liability","equity","revenue","expense"].map(t => (
        <Card key={t}>
          <CardContent className="p-0">
            <div className="px-4 py-2 border-b bg-muted/30 text-xs uppercase tracking-widest text-muted-foreground">{t}</div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Balance</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(grouped[t] ?? []).map((a: any) => (
                  <TableRow key={a.account_id}>
                    <TableCell className="font-mono text-xs">{a.code}</TableCell>
                    <TableCell className="flex items-center gap-1">{a.name}</TableCell>
                    <TableCell className="text-right text-xs">₹{Number(a.debit).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right text-xs">₹{Number(a.credit).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(a.balance).toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
                {(grouped[t] ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">No accounts</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}