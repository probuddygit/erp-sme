import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/procurement/suppliers")({
  component: SuppliersPage,
});

interface Supplier {
  id: string; name: string; code: string | null; contact_person: string | null;
  email: string | null; phone: string | null; gst_number: string | null;
  payment_terms: string | null; lead_time_days: number; rating: number; is_active: boolean;
}

function SuppliersPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("procurement");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", contact_person: "", email: "", phone: "", gst_number: "", address: "", payment_terms: "Net 30", lead_time_days: "7" });

  const { data: suppliers, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["suppliers", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").eq("company_id", company!.id).order("name");
      if (error) throw error;
      return data as Supplier[];
    },
  });

  // Scorecard data: orders received vs on-time, avg PO value
  const { data: scorecards } = useQuery({
    enabled: !!company?.id,
    queryKey: ["supplier-scorecard", company?.id],
    queryFn: async () => {
      const { data: pos } = await supabase
        .from("purchase_orders")
        .select("supplier_id, status, grand_total, expected_date, updated_at")
        .eq("company_id", company!.id);
      const map = new Map<string, { total: number; received: number; onTime: number; spend: number }>();
      (pos ?? []).forEach((p: any) => {
        const cur = map.get(p.supplier_id) ?? { total: 0, received: 0, onTime: 0, spend: 0 };
        cur.total += 1;
        cur.spend += Number(p.grand_total ?? 0);
        if (p.status === "received") {
          cur.received += 1;
          if (p.expected_date && p.updated_at && new Date(p.updated_at) <= new Date(p.expected_date)) cur.onTime += 1;
        }
        map.set(p.supplier_id, cur);
      });
      return map;
    },
  });

  const filtered = useMemo(() => (suppliers ?? []).filter(s => !search || [s.name, s.code, s.email, s.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))), [suppliers, search]);

  const create = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("suppliers").insert({
      company_id: company!.id,
      name: form.name.trim(),
      code: form.code.trim() || null,
      contact_person: form.contact_person.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      gst_number: form.gst_number.trim() || null,
      address: form.address.trim() || null,
      payment_terms: form.payment_terms.trim() || null,
      lead_time_days: Number(form.lead_time_days) || 7,
      created_by: u.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Supplier added");
    setOpen(false);
    setForm({ name: "", code: "", contact_person: "", email: "", phone: "", gst_number: "", address: "", payment_terms: "Net 30", lead_time_days: "7" });
    qc.invalidateQueries({ queryKey: ["suppliers"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers…" className="pl-9" />
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New supplier</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add supplier</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
                  <div><Label>GST number</Label><Input value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Contact person</Label><Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Address</Label><Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Payment terms</Label><Input value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} /></div>
                  <div><Label>Lead time (days)</Label><Input type="number" value={form.lead_time_days} onChange={e => setForm({ ...form, lead_time_days: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={create}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Lead time</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>On-time %</TableHead>
                <TableHead>Total spend</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />No suppliers yet.
                </TableCell></TableRow>
              ) : filtered.map((s) => {
                const sc = scorecards?.get(s.id);
                const onTime = sc && sc.received > 0 ? Math.round((sc.onTime / sc.received) * 100) : 0;
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.code ?? "—"} · {s.payment_terms ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{s.contact_person ?? "—"}</div>
                      <div className="text-muted-foreground">{s.email ?? s.phone ?? "—"}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{s.lead_time_days}d</Badge></TableCell>
                    <TableCell className="text-sm">{sc?.total ?? 0}</TableCell>
                    <TableCell className="text-sm">{sc && sc.received > 0 ? `${onTime}%` : "—"}</TableCell>
                    <TableCell className="text-sm">₹{(sc?.spend ?? 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5 fill-current" /><span className="text-sm">{Number(s.rating).toFixed(1)}</span></div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}