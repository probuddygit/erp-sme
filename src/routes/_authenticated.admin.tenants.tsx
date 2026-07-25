import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listTenants,
  createTenant,
  updateTenant,
  suspendTenant,
} from "@/features/admin-platform/admin-platform.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Building2, Plus, Search, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/tenants")({
  component: TenantsPage,
});

const PLANS = ["trial", "starter", "pro", "enterprise"] as const;

function TenantsPage() {
  const fetchTenants = useServerFn(listTenants);
  const createTenantFn = useServerFn(createTenant);
  const updateTenantFn = useServerFn(updateTenant);
  const suspendTenantFn = useServerFn(suspendTenant);

  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    plan: "trial" as typeof PLANS[number],
    ownerEmail: "",
    ownerFullName: "",
    ownerPassword: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchTenants({
        data: {
          search: search || undefined,
          plan: planFilter as any || undefined,
          page,
          limit: 20,
        },
      });
      setRows(res.rows);
      setCount(res.count);
    } catch (e: any) {
      toast.error(e.message || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, planFilter, page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.ownerPassword.length < 8) {
      return toast.error("Password must be at least 8 characters");
    }
    setSubmitting(true);
    try {
      await createTenantFn({ data: form });
      toast.success("Tenant created");
      setForm({ name: "", slug: "", plan: "trial", ownerEmail: "", ownerFullName: "", ownerPassword: "" });
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to create tenant");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePlan = async (id: string, plan: string) => {
    try {
      await updateTenantFn({ data: { companyId: id, plan: plan as any } });
      toast.success("Plan updated");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update plan");
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      if (current) {
        await suspendTenantFn({ data: { companyId: id, reason: "Manual suspension" } });
        toast.success("Tenant suspended");
      } else {
        await updateTenantFn({ data: { companyId: id, isActive: true } });
        toast.success("Tenant activated");
      }
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenants…"
              className="w-64 pl-9"
            />
          </div>
          <Select value={planFilter} onValueChange={(v) => setPlanFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All plans</SelectItem>
              {PLANS.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              New tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create tenant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Company name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v as typeof PLANS[number] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANS.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                <Label>Owner full name</Label>
                <Input value={form.ownerFullName} onChange={(e) => setForm({ ...form, ownerFullName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Owner email</Label>
                <Input type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Owner password</Label>
                <Input type="password" value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating…" : "Create tenant"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenants ({count})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-3 font-medium">No tenants found</p>
              <p className="text-sm text-muted-foreground">Create a new tenant or adjust filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">/{row.slug}</div>
                      </TableCell>
                      <TableCell>
                        <Select value={row.plan} onValueChange={(v) => handleUpdatePlan(row.id, v)}>
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLANS.map((p) => (
                              <SelectItem key={p} value={p} className="capitalize">
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.isActive ? "default" : "secondary"}>
                          {row.isActive ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{row.subscription?.status ?? "—"}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch checked={row.isActive} onCheckedChange={(v) => handleToggleActive(row.id, v)} />
                          <Link to="/admin/tenants/$id" params={{ id: row.id }}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button variant="outline" size="sm" disabled={rows.length < 20} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
