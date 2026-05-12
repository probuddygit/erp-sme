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
import { RowActions } from "@/components/RowActions";

export const Route = createFileRoute("/_authenticated/app/finance/accounts")({
  component: AccountsPage,
});

function AccountsPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("finance");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState(""); const [name, setName] = useState(""); const [type, setType] = useState("expense");

  const { data: accounts } = useQuery({
    enabled: !!company?.id,
    queryKey: ["coa-balances", company?.id],
    queryFn: async () => (await supabase.rpc("account_balances", { _company_id: company!.id })).data ?? [],
  });

  const { data: systemMap } = useQuery({
    enabled: !!company?.id,
    queryKey: ["coa-system", company?.id],
    queryFn: async () => {
      const { data } = await supabase.from("chart_of_accounts").select("id,is_system").eq("company_id", company!.id);
      const m: Record<string, boolean> = {};
      (data ?? []).forEach((r: any) => { m[r.id] = !!r.is_system; });
      return m;
    },
  });

  const submit = async () => {
    if (!code || !name) { toast.error("Code and name required"); return; }
    const { error } = editingId
      ? await supabase.from("chart_of_accounts").update({ code, name, type: type as any }).eq("id", editingId)
      : await supabase.from("chart_of_accounts").insert({ company_id: company!.id, code, name, type: type as any, is_system: false });
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Account updated" : "Account added");
    setOpen(false); setEditingId(null); setCode(""); setName(""); setType("expense");
    qc.invalidateQueries({ queryKey: ["coa-balances"] });
  };

  const startEdit = (a: any) => {
    setEditingId(a.account_id); setCode(a.code); setName(a.name); setType(a.type);
    setOpen(true);
  };

  const grouped = (accounts ?? []).reduce<Record<string, any[]>>((acc: Record<string, any[]>, r: any) => {
    (acc[r.type] = acc[r.type] || []).push({ ...r, is_system: systemMap?.[r.account_id] ?? false }); return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Chart of Accounts</h2>
        {canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setCode(""); setName(""); setType("expense"); } }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New account</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? "Edit account" : "Add account"}</DialogTitle></DialogHeader>
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
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>{editingId ? "Save" : "Add"}</Button></DialogFooter>
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
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="w-20"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(grouped[t] ?? []).map((a: any) => (
                  <TableRow key={a.account_id}>
                    <TableCell className="font-mono text-xs">{a.code}</TableCell>
                    <TableCell className="flex items-center gap-1">{a.name}{a.is_system && <Lock className="h-3 w-3 text-muted-foreground" />}</TableCell>
                    <TableCell className="text-right text-xs">₹{Number(a.debit).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right text-xs">₹{Number(a.credit).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(a.balance).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      {canEdit && !a.is_system && (
                        <RowActions
                          onEdit={() => startEdit(a)}
                          table="chart_of_accounts"
                          id={a.account_id}
                          label={`account ${a.code}`}
                          invalidateKeys={[["coa-balances", company?.id]]}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(grouped[t] ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">No accounts</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}