import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getTenantDetails,
  updateTenant,
  createInvoice,
  listInvoices,
  markInvoicePaid,
  deleteInvoice,
} from "@/features/admin-platform/admin-platform.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Building2, Users, Receipt, MapPin, CheckCircle2, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/tenants/$id")({
  component: TenantDetailPage,
});

const PLANS = ["trial", "starter", "pro", "enterprise"] as const;

function TenantDetailPage() {
  const { id } = useParams({ from: "/_authenticated/admin/tenants/$id" });
  const fetchDetails = useServerFn(getTenantDetails);
  const updateTenantFn = useServerFn(updateTenant);
  const createInvoiceFn = useServerFn(createInvoice);
  const fetchInvoices = useServerFn(listInvoices);
  const markPaidFn = useServerFn(markInvoicePaid);
  const deleteInvoiceFn = useServerFn(deleteInvoice);

  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getTenantDetails>> | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ amount: "", tax: "", dueDate: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [d, inv] = await Promise.all([
        fetchDetails({ data: { companyId: id } }),
        fetchInvoices({ data: { companyId: id } }),
      ]);
      setDetail(d);
      setInvoices(inv.rows);
    } catch (e: any) {
      toast.error(e.message || "Failed to load tenant");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleUpdatePlan = async (plan: string) => {
    try {
      await updateTenantFn({ data: { companyId: id, plan: plan as any } });
      toast.success("Plan updated");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update plan");
    }
  };

  const handleToggleActive = async (v: boolean) => {
    try {
      await updateTenantFn({ data: { companyId: id, isActive: v } });
      toast.success(v ? "Tenant activated" : "Tenant suspended");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createInvoiceFn({
        data: {
          companyId: id,
          amount: Number(invoiceForm.amount),
          tax: Number(invoiceForm.tax),
          dueDate: invoiceForm.dueDate,
        },
      });
      toast.success("Invoice created");
      setInvoiceForm({ amount: "", tax: "", dueDate: "" });
      setInvoiceOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      await markPaidFn({ data: { invoiceId } });
      toast.success("Invoice marked paid");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("Delete this invoice?")) return;
    try {
      await deleteInvoiceFn({ data: { invoiceId } });
      toast.success("Invoice deleted");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!detail) return <div>Tenant not found</div>;

  const { company, branches, users, subscription } = detail;
  const organization = company?.organizations as any;


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/admin/tenants">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">{company.name}</CardTitle>
                <div className="text-sm text-muted-foreground">/{company.slug} · {organization?.name ?? "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={company.is_active ? "default" : "secondary"}>
                {company.is_active ? "Active" : "Suspended"}
              </Badge>
              <Switch checked={company.is_active} onCheckedChange={handleToggleActive} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Plan</div>
            <Select value={company.plan} onValueChange={handleUpdatePlan}>
              <SelectTrigger className="w-40">
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
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Subscription status</div>
            <div className="text-sm font-medium capitalize">{subscription?.status ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Monthly price</div>
            <div className="text-sm font-medium">{formatCurrency(subscription?.monthly_price ?? 0, "INR")}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Branches ({branches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {branches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No branches configured.</p>
            ) : (
              <div className="space-y-2">
                {branches.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <div className="font-medium text-sm">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.code}</div>
                    </div>
                    {b.is_head_office && <Badge variant="outline">Head Office</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users in this tenant.</p>
            ) : (
              <div className="space-y-2">
                {users.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <div className="font-medium text-sm">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoices ({invoices.length})
          </CardTitle>
          <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Create invoice</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create invoice</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" min={0} step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Tax</Label>
                  <Input type="number" min={0} step="0.01" value={invoiceForm.tax} onChange={(e) => setInvoiceForm({ ...invoiceForm, tax: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} required />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating…" : "Create invoice"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{formatCurrency(inv.amount + inv.tax, "INR")}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="capitalize">
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(inv.due_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {inv.status !== "paid" && (
                          <Button variant="ghost" size="sm" onClick={() => handleMarkPaid(inv.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />Mark paid
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteInvoice(inv.id)} aria-label="Delete invoice">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
