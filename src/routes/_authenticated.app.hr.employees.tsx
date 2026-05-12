import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";

export const Route = createFileRoute("/_authenticated/app/hr/employees")({
  component: EmployeesPage,
});

type Employee = {
  id: string; employee_code: string; full_name: string; email: string | null;
  phone: string | null; designation: string | null; department: string | null;
  date_of_joining: string; status: string; ctc_annual: number;
};

function EmployeesPage() {
  const { company, isCompanyAdmin, hasRole } = useAuth();
  const canManage = isCompanyAdmin || hasRole("hr");
  const [list, setList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employee_code: "", full_name: "", email: "", phone: "",
    designation: "", department: "", date_of_joining: new Date().toISOString().slice(0, 10),
    ctc_annual: 0, status: "active",
    basic: 0, hra: 0, special_allowance: 0,
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data } = await supabase.from("employees").select("*").eq("company_id", company.id).order("created_at", { ascending: false });
    setList((data ?? []) as Employee[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [company?.id]);

  const submit = async () => {
    if (!company?.id) return;
    if (!form.employee_code || !form.full_name) { toast.error("Code and name required"); return; }
    const { data: emp, error } = await supabase.from("employees").insert({
      company_id: company.id,
      employee_code: form.employee_code, full_name: form.full_name,
      email: form.email || null, phone: form.phone || null,
      designation: form.designation || null, department: form.department || null,
      date_of_joining: form.date_of_joining, ctc_annual: Number(form.ctc_annual),
      status: form.status as "active",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (form.basic || form.hra || form.special_allowance) {
      await supabase.from("salary_structures").insert({
        company_id: company.id, employee_id: emp.id,
        basic: Number(form.basic), hra: Number(form.hra),
        special_allowance: Number(form.special_allowance),
      });
    }
    toast.success("Employee added");
    setOpen(false);
    setForm({ ...form, employee_code: "", full_name: "", email: "", phone: "", designation: "", department: "", ctc_annual: 0, basic: 0, hra: 0, special_allowance: 0 });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Employees</h2>
          <p className="text-sm text-muted-foreground">{list.length} record(s)</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add employee</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>New employee</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code *"><Input value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} /></Field>
                <Field label="Full name *"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Designation"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
                <Field label="Department"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
                <Field label="Joining date"><Input type="date" value={form.date_of_joining} onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })} /></Field>
                <Field label="CTC (annual)"><Input type="number" value={form.ctc_annual} onChange={(e) => setForm({ ...form, ctc_annual: Number(e.target.value) })} /></Field>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_leave">On leave</SelectItem>
                      <SelectItem value="resigned">Resigned</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="col-span-2 mt-2 text-sm font-medium">Salary structure (monthly)</div>
                <Field label="Basic"><Input type="number" value={form.basic} onChange={(e) => setForm({ ...form, basic: Number(e.target.value) })} /></Field>
                <Field label="HRA"><Input type="number" value={form.hra} onChange={(e) => setForm({ ...form, hra: Number(e.target.value) })} /></Field>
                <Field label="Special allowance"><Input type="number" value={form.special_allowance} onChange={(e) => setForm({ ...form, special_allowance: Number(e.target.value) })} /></Field>
              </div>
              <DialogFooter><Button onClick={submit}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Employee directory</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : list.length === 0 ? <p className="text-sm text-muted-foreground">No employees yet.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Designation</TableHead>
                <TableHead>Department</TableHead><TableHead>Joined</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">CTC</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {list.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                    <TableCell className="font-medium">{e.full_name}</TableCell>
                    <TableCell>{e.designation || "—"}</TableCell>
                    <TableCell>{e.department || "—"}</TableCell>
                    <TableCell>{e.date_of_joining}</TableCell>
                    <TableCell><Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono">₹ {Number(e.ctc_annual).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      {canManage && (
                        <RowActions
                          label={`employee ${e.full_name}`}
                          onDelete={async () => {
                            await supabase.from("salary_structures").delete().eq("employee_id", e.id);
                            const { error } = await supabase.from("employees").delete().eq("id", e.id);
                            if (error) throw error;
                            load();
                          }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}