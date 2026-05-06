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
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/hr/attendance")({
  component: AttendancePage,
});

type Emp = { id: string; employee_code: string; full_name: string };
type Att = { id: string; employee_id: string; status: string; check_in: string | null; check_out: string | null; hours_worked: number };

const STATUSES = ["present", "absent", "half_day", "leave", "holiday", "week_off"] as const;

function AttendancePage() {
  const { company, isCompanyAdmin, hasRole } = useAuth();
  const canManage = isCompanyAdmin || hasRole("hr");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [emps, setEmps] = useState<Emp[]>([]);
  const [att, setAtt] = useState<Record<string, Att | null>>({});

  const load = async () => {
    if (!company?.id) return;
    const [{ data: e }, { data: a }] = await Promise.all([
      supabase.from("employees").select("id,employee_code,full_name").eq("company_id", company.id).eq("status", "active").order("full_name"),
      supabase.from("attendance").select("*").eq("company_id", company.id).eq("attendance_date", date),
    ]);
    setEmps((e ?? []) as Emp[]);
    const map: Record<string, Att | null> = {};
    (a ?? []).forEach((r: any) => { map[r.employee_id] = r as Att; });
    setAtt(map);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [company?.id, date]);

  const setStatus = async (employee_id: string, status: string) => {
    if (!company?.id || !canManage) return;
    const existing = att[employee_id];
    if (existing) {
      const { error } = await supabase.from("attendance").update({ status: status as "present" }).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("attendance").insert({
        company_id: company.id, employee_id, attendance_date: date, status: status as "present",
      });
      if (error) { toast.error(error.message); return; }
    }
    load();
  };

  const markAllPresent = async () => {
    if (!canManage || !company?.id) return;
    const missing = emps.filter((e) => !att[e.id]);
    if (missing.length === 0) return;
    const { error } = await supabase.from("attendance").insert(missing.map((e) => ({
      company_id: company.id!, employee_id: e.id, attendance_date: date, status: "present" as const,
    })));
    if (error) toast.error(error.message); else { toast.success(`Marked ${missing.length} present`); load(); }
  };

  const summary = STATUSES.reduce((acc, s) => { acc[s] = 0; return acc; }, {} as Record<string, number>);
  emps.forEach((e) => { const r = att[e.id]; if (r) summary[r.status] = (summary[r.status] || 0) + 1; });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        {canManage && <Button variant="outline" onClick={markAllPresent}>Mark all present</Button>}
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        {STATUSES.map((s) => (
          <Card key={s}><CardContent className="p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.replace("_", " ")}</div>
            <div className="mt-1 text-2xl font-bold">{summary[s]}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Daily attendance — {date}</CardTitle></CardHeader>
        <CardContent>
          {emps.length === 0 ? <p className="text-sm text-muted-foreground">No active employees.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Employee</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {emps.map((e) => {
                  const r = att[e.id];
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                      <TableCell className="font-medium">{e.full_name}</TableCell>
                      <TableCell>
                        <Select value={r?.status ?? ""} onValueChange={(v) => setStatus(e.id, v)} disabled={!canManage}>
                          <SelectTrigger className="w-44"><SelectValue placeholder="Not marked" /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}