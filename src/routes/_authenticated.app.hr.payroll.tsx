import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/hr/payroll")({
  component: PayrollPage,
});

type Run = {
  id: string; run_number: string; period_month: number; period_year: number;
  pay_date: string; status: string; total_gross: number; total_net: number;
};
type Item = {
  id: string; employee_id: string; days_present: number; days_in_month: number;
  basic: number; hra: number; allowances: number; gross: number;
  pf_employee: number; pf_employer: number; esi_employee: number; esi_employer: number;
  professional_tax: number; tds: number; other_deductions: number; net_pay: number;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function PayrollPage() {
  const { company, isCompanyAdmin, hasRole } = useAuth();
  const canManage = isCompanyAdmin || hasRole("hr");
  const [runs, setRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState<Run | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [empNames, setEmpNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({ month: now.getMonth() + 1, year: now.getFullYear(), pay_date: now.toISOString().slice(0, 10) });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from("payroll_runs").select("*").eq("company_id", company.id).order("pay_date", { ascending: false });
    setRuns((data ?? []) as Run[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [company?.id]);

  const loadItems = async (run: Run) => {
    setSelected(run);
    const { data } = await supabase.from("payroll_items").select("*").eq("run_id", run.id);
    setItems((data ?? []) as Item[]);
    const ids = (data ?? []).map((i: any) => i.employee_id);
    if (ids.length) {
      const { data: e } = await supabase.from("employees").select("id,full_name,employee_code").in("id", ids);
      const m: Record<string, string> = {};
      (e ?? []).forEach((x: any) => { m[x.id] = `${x.employee_code} — ${x.full_name}`; });
      setEmpNames(m);
    }
  };

  const createRun = async () => {
    if (!company?.id) return;
    // 1) get number
    const { data: numData, error: nErr } = await supabase.rpc("next_payroll_number", { _company_id: company.id });
    if (nErr) { toast.error(nErr.message); return; }
    // 2) employees + salary structures + attendance counts
    const { data: emps } = await supabase.from("employees").select("id").eq("company_id", company.id).eq("status", "active");
    if (!emps?.length) { toast.error("No active employees"); return; }
    const empIds = emps.map((e) => e.id);
    const { data: structs } = await supabase.from("salary_structures").select("*").in("employee_id", empIds);
    const structMap: Record<string, any> = {};
    (structs ?? []).forEach((s: any) => { if (!structMap[s.employee_id]) structMap[s.employee_id] = s; });

    const monthStart = `${form.year}-${String(form.month).padStart(2, "0")}-01`;
    const monthEnd = new Date(form.year, form.month, 0);
    const daysInMonth = monthEnd.getDate();
    const monthEndStr = monthEnd.toISOString().slice(0, 10);
    const { data: attRows } = await supabase.from("attendance").select("employee_id,status").eq("company_id", company.id).gte("attendance_date", monthStart).lte("attendance_date", monthEndStr);
    const presentMap: Record<string, number> = {};
    (attRows ?? []).forEach((a: any) => {
      const w = a.status === "present" || a.status === "holiday" || a.status === "week_off" ? 1 : a.status === "half_day" ? 0.5 : 0;
      presentMap[a.employee_id] = (presentMap[a.employee_id] || 0) + w;
    });

    // 3) insert run
    const { data: run, error: rErr } = await supabase.from("payroll_runs").insert({
      company_id: company.id, run_number: numData as string,
      period_month: form.month, period_year: form.year, pay_date: form.pay_date, status: "draft",
    }).select().single();
    if (rErr) { toast.error(rErr.message); return; }

    // 4) build items
    const lines = empIds.map((eid) => {
      const s = structMap[eid] || { basic: 0, hra: 0, special_allowance: 0, conveyance: 0, other_allowances: 0, pf_employee_percent: 12, pf_employer_percent: 12, esi_employee_percent: 0.75, esi_employer_percent: 3.25, professional_tax: 200 };
      const days_present = presentMap[eid] ?? daysInMonth;
      const factor = days_present / daysInMonth;
      const basic = +(Number(s.basic) * factor).toFixed(2);
      const hra = +(Number(s.hra) * factor).toFixed(2);
      const allowances = +((Number(s.conveyance) + Number(s.special_allowance) + Number(s.other_allowances)) * factor).toFixed(2);
      const gross = +(basic + hra + allowances).toFixed(2);
      const pfBase = Math.min(basic, 15000); // PF wage cap
      const pf_employee = +(pfBase * Number(s.pf_employee_percent) / 100).toFixed(2);
      const pf_employer = +(pfBase * Number(s.pf_employer_percent) / 100).toFixed(2);
      const esiApplies = gross <= 21000;
      const esi_employee = esiApplies ? +(gross * Number(s.esi_employee_percent) / 100).toFixed(2) : 0;
      const esi_employer = esiApplies ? +(gross * Number(s.esi_employer_percent) / 100).toFixed(2) : 0;
      const professional_tax = gross > 0 ? Number(s.professional_tax) : 0;
      const net_pay = +(gross - pf_employee - esi_employee - professional_tax).toFixed(2);
      return {
        company_id: company.id!, run_id: run.id, employee_id: eid,
        days_present, days_in_month: daysInMonth,
        basic, hra, allowances, gross,
        pf_employee, pf_employer, esi_employee, esi_employer,
        professional_tax, tds: 0, other_deductions: 0, net_pay,
      };
    });
    const { error: iErr } = await supabase.from("payroll_items").insert(lines);
    if (iErr) { toast.error(iErr.message); return; }

    // 5) totals
    const totals = lines.reduce((a, l) => ({
      g: a.g + l.gross, n: a.n + l.net_pay, d: a.d + (l.gross - l.net_pay),
      pe: a.pe + l.pf_employee, pr: a.pr + l.pf_employer,
      ee: a.ee + l.esi_employee, er: a.er + l.esi_employer,
    }), { g: 0, n: 0, d: 0, pe: 0, pr: 0, ee: 0, er: 0 });
    await supabase.from("payroll_runs").update({
      total_gross: totals.g, total_net: totals.n, total_deductions: totals.d,
      total_pf_employee: totals.pe, total_pf_employer: totals.pr,
      total_esi_employee: totals.ee, total_esi_employer: totals.er,
      status: "processed",
    }).eq("id", run.id);
    toast.success(`Payroll ${numData} processed`);
    setOpen(false);
    load();
  };

  const post = async (run: Run) => {
    if (!confirm(`Post ${run.run_number} to finance? This will create journal entries.`)) return;
    const { error } = await supabase.from("payroll_runs").update({ status: "posted" }).eq("id", run.id);
    if (error) toast.error(error.message); else { toast.success("Posted to ledger"); load(); if (selected?.id === run.id) loadItems({ ...run, status: "posted" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Payroll runs</h2>
          <p className="text-sm text-muted-foreground">Process monthly payroll and post to finance.</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New payroll run</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Process payroll</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Month</Label>
                    <Select value={String(form.month)} onValueChange={(v) => setForm({ ...form, month: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Year</Label>
                    <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pay date</Label>
                  <Input type="date" value={form.pay_date} onChange={(e) => setForm({ ...form, pay_date: e.target.value })} />
                </div>
                <p className="text-xs text-muted-foreground">Generates payroll items for all active employees using their salary structure and attendance for the month. PF capped at ₹15,000 basic; ESI applied if gross ≤ ₹21,000.</p>
              </div>
              <DialogFooter><Button onClick={createRun}>Process</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Runs</CardTitle></CardHeader>
          <CardContent>
            {runs.length === 0 ? <p className="text-sm text-muted-foreground">No payroll runs yet.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Net</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => loadItems(r)}>
                      <TableCell className="font-mono text-xs">{r.run_number}</TableCell>
                      <TableCell>{MONTHS[r.period_month - 1]} {r.period_year}</TableCell>
                      <TableCell><Badge variant={r.status === "posted" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                      <TableCell className="text-right font-mono">₹ {Number(r.total_net).toLocaleString("en-IN")}</TableCell>
                      <TableCell>{canManage && r.status === "processed" && <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); post(r); }}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Post</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />{selected ? `${selected.run_number} — ${MONTHS[selected.period_month - 1]} ${selected.period_year}` : "Select a run"}</CardTitle></CardHeader>
          <CardContent>
            {!selected ? <p className="text-sm text-muted-foreground">Pick a payroll run to see details.</p> : items.length === 0 ? <p className="text-sm text-muted-foreground">No items.</p> : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Employee</TableHead><TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">PF</TableHead>
                    <TableHead className="text-right">ESI</TableHead>
                    <TableHead className="text-right">PT</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="text-xs">{empNames[i.employee_id] || i.employee_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-right font-mono">{i.days_present}/{i.days_in_month}</TableCell>
                        <TableCell className="text-right font-mono">{Number(i.gross).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right font-mono">{Number(i.pf_employee).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right font-mono">{Number(i.esi_employee).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right font-mono">{Number(i.professional_tax).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{Number(i.net_pay).toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}