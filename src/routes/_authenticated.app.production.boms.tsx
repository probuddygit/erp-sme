import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { Plus, Search, GitBranch, Eye } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";

export const Route = createFileRoute("/_authenticated/app/production/boms")({
  component: BomsPage,
});

interface Bom {
  id: string;
  product_name: string;
  product_code: string | null;
  version: string;
  output_quantity: number;
  output_unit: string;
  status: string;
  created_at: string;
}

function BomsPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("production");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    product_name: "",
    product_code: "",
    version: "v1",
    output_quantity: "1",
    output_unit: "pcs",
    notes: "",
  });

  const { data: boms, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["boms", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills_of_materials")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Bom[];
    },
  });

  const filtered = (boms ?? []).filter((b) =>
    [b.product_name, b.product_code, b.version].some((v) => v?.toLowerCase().includes(search.toLowerCase())),
  );

  const createBom = async () => {
    if (!form.product_name.trim()) {
      toast.error("Product name is required");
      return;
    }
    const payload = {
      product_name: form.product_name.trim(),
      product_code: form.product_code.trim() || null,
      version: form.version.trim() || "v1",
      output_quantity: Number(form.output_quantity) || 1,
      output_unit: form.output_unit.trim() || "pcs",
      notes: form.notes.trim() || null,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from("bills_of_materials").update(payload).eq("id", editingId));
    } else {
      const { data: u } = await supabase.auth.getUser();
      ({ error } = await supabase.from("bills_of_materials").insert({ ...payload, company_id: company!.id, created_by: u.user?.id ?? null }));
    }
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? "BOM updated" : "BOM created");
    setOpen(false); setEditingId(null);
    setForm({ product_name: "", product_code: "", version: "v1", output_quantity: "1", output_unit: "pcs", notes: "" });
    qc.invalidateQueries({ queryKey: ["boms"] });
  };

  const startEdit = (b: Bom & { notes?: string | null }) => {
    setEditingId(b.id);
    setForm({
      product_name: b.product_name,
      product_code: b.product_code ?? "",
      version: b.version,
      output_quantity: String(b.output_quantity),
      output_unit: b.output_unit,
      notes: (b as any).notes ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, code, version…"
            className="pl-9"
          />
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm({ product_name: "", product_code: "", version: "v1", output_quantity: "1", output_unit: "pcs", notes: "" }); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />New BOM</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Bill of Materials" : "Create Bill of Materials"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Product name *</Label>
                  <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Product code</Label>
                    <Input value={form.product_code} onChange={(e) => setForm({ ...form, product_code: e.target.value })} />
                  </div>
                  <div>
                    <Label>Version</Label>
                    <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Output quantity</Label>
                    <Input type="number" step="0.001" value={form.output_quantity} onChange={(e) => setForm({ ...form, output_quantity: e.target.value })} />
                  </div>
                  <div>
                    <Label>Output unit</Label>
                    <Input value={form.output_unit} onChange={(e) => setForm({ ...form, output_unit: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={createBom}>{editingId ? "Save" : "Create"}</Button>
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
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Output</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No BOMs yet. Create one to define how a finished good is built.
                </TableCell></TableRow>
              ) : filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.product_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{b.product_code ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{b.version}</Badge></TableCell>
                  <TableCell>{b.output_quantity} {b.output_unit}</TableCell>
                  <TableCell><Badge variant={b.status === "active" ? "default" : "secondary"}>{b.status}</Badge></TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-0.5">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/app/production/boms/$id" params={{ id: b.id }}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      {canEdit && (
                        <RowActions
                          onEdit={() => startEdit(b)}
                          label={`BOM "${b.product_name}"`}
                          invalidateKeys={[["boms", company?.id]]}
                          onDelete={async () => {
                            await sb.from("bom_components").delete().eq("bom_id", b.id);
                            const { error } = await sb.from("bills_of_materials").delete().eq("id", b.id);
                            if (error) throw error;
                          }}
                        />
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}