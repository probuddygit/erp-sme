import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listInvoices, markInvoicePaid } from "@/features/admin-platform/admin-platform.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/billing")({
  component: BillingPage,
});

const STATUSES = ["draft", "open", "paid", "void"] as const;

function BillingPage() {
  const fetchInvoices = useServerFn(listInvoices);
  const markPaidFn = useServerFn(markInvoicePaid);

  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchInvoices({
        data: {
          status: statusFilter as any || undefined,
          page,
          limit: 20,
        },
      });
      setRows(res.rows);
      setCount(res.count);
    } catch (e: any) {
      toast.error(e.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, page]);

  const handleMarkPaid = async (id: string) => {
    try {
      await markPaidFn({ data: { invoiceId: id } });
      toast.success("Invoice marked as paid");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to mark paid");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoices ({count})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-3 font-medium">No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.invoice_number}</TableCell>
                      <TableCell>{row.companies?.name ?? "—"}</TableCell>
                      <TableCell>{formatCurrency(row.amount, "INR")}</TableCell>
                      <TableCell>{formatCurrency(row.tax, "INR")}</TableCell>
                      <TableCell>{formatCurrency(row.amount + row.tax, "INR")}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "paid" ? "default" : "secondary"} className="capitalize">
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(row.due_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {row.status === "open" && (
                          <Button size="sm" onClick={() => handleMarkPaid(row.id)}>
                            Mark paid
                          </Button>
                        )}
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
