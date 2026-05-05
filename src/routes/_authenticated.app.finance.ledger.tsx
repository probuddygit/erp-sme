import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/finance/ledger")({
  component: LedgerPage,
});

function LedgerPage() {
  const { company } = useAuth();
  const [accountId, setAccountId] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: accounts } = useQuery({
    enabled: !!company?.id,
    queryKey: ["coa-list", company?.id],
    queryFn: async () => (await supabase.from("chart_of_accounts").select("id, code, name").eq("company_id", company!.id).order("code")).data ?? [],
  });

  const { data: lines } = useQuery({
    enabled: !!company?.id,
    queryKey: ["ledger", company?.id, accountId, from, to],
    queryFn: async () => {
      let q = supabase.from("journal_lines")
        .select("id, debit, credit, description, account_id, journal_entries!inner(entry_number, entry_date, narration, source_module, status, company_id), chart_of_accounts!inner(code, name)")
        .eq("company_id", company!.id)
        .eq("journal_entries.status", "posted")
        .order("created_at", { ascending: false })
        .limit(500);
      if (accountId !== "all") q = q.eq("account_id", accountId);
      if (from) q = q.gte("journal_entries.entry_date", from);
      if (to) q = q.lte("journal_entries.entry_date", to);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div><Label>Account</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Entry</TableHead><TableHead>Account</TableHead><TableHead>Description</TableHead>
            <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead>Source</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(lines?.length ?? 0) === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12"><BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />No journal entries.</TableCell></TableRow>
            ) : lines!.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs text-muted-foreground">{l.journal_entries.entry_date}</TableCell>
                <TableCell className="font-mono text-xs">{l.journal_entries.entry_number}</TableCell>
                <TableCell className="text-xs">{l.chart_of_accounts.code} {l.chart_of_accounts.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.description ?? l.journal_entries.narration}</TableCell>
                <TableCell className="text-right">{Number(l.debit) ? `₹${Number(l.debit).toLocaleString("en-IN")}` : "—"}</TableCell>
                <TableCell className="text-right">{Number(l.credit) ? `₹${Number(l.credit).toLocaleString("en-IN")}` : "—"}</TableCell>
                <TableCell className="text-xs capitalize text-muted-foreground">{l.journal_entries.source_module ?? "manual"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}