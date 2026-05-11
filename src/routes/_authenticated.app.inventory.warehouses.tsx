import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";

export const Route = createFileRoute("/_authenticated/app/inventory/warehouses")({
  component: WarehousesPage,
});

type WH = { id: string; code: string; name: string; address: string | null; is_active: boolean };

function WarehousesPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("procurement") || hasRole("production");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", address: "" });

  const { data } = useQuery({
    enabled: !!company?.id,
    queryKey: ["warehouses", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("*").eq("company_id", company!.id).order("name");
      if (error) throw error;
      return data as WH[];
    },
  });

  const create = async () => {
    if (!form.code.trim() || !form.name.trim()) { toast.error("Code and name required"); return; }
    const payload = { code: form.code.trim(), name: form.name.trim(), address: form.address.trim() || null };
    const { error } = editingId
      ? await supabase.from("warehouses").update(payload).eq("id", editingId)
      : await supabase.from("warehouses").insert({ ...payload, company_id: company!.id });
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Warehouse updated" : "Warehouse created");
    setOpen(false); setEditingId(null);
    setForm({ code: "", name: "", address: "" });
    qc.invalidateQueries({ queryKey: ["warehouses"] });
  };

  const startEdit = (w: WH) => {
    setEditingId(w.id);
    setForm({ code: w.code, name: w.name, address: w.address ?? "" });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{data?.length ?? 0} warehouses</div>
        {canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm({ code: "", name: "", address: "" }); } }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New warehouse</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? "Edit warehouse" : "New warehouse"}</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                  <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                </div>
                <div><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>{editingId ? "Save" : "Create"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((w) => (
          <Card key={w.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><Warehouse className="h-4 w-4" />{w.name}</CardTitle>
              {canEdit && (
                <RowActions
                  onEdit={() => startEdit(w)}
                  table="warehouses"
                  id={w.id}
                  label={`warehouse "${w.name}"`}
                  invalidateKeys={[["warehouses", company?.id]]}
                />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground font-mono">{w.code}</div>
              {w.address && <div className="text-sm mt-2 whitespace-pre-line">{w.address}</div>}
            </CardContent>
          </Card>
        ))}
        {!data?.length && <div className="text-sm text-muted-foreground">No warehouses yet.</div>}
      </div>
    </div>
  );
}