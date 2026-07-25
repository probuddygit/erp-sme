import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listSubscriptions,
  updateSubscription,
} from "@/features/admin-platform/admin-platform.functions";
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
import { CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  component: SubscriptionsPage,
});

const PLANS = ["trial", "starter", "pro", "enterprise"] as const;
const STATUSES = ["active", "trial", "cancelled", "past_due", "suspended"] as const;

function SubscriptionsPage() {
  const fetchSubscriptions = useServerFn(listSubscriptions);
  const updateSubscriptionFn = useServerFn(updateSubscription);

  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [planFilter, setPlanFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchSubscriptions({
        data: {
          status: statusFilter as any || undefined,
          plan: planFilter as any || undefined,
          page,
          limit: 20,
        },
      });
      setRows(res.rows);
      setCount(res.count);
    } catch (e: any) {
      toast.error(e.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, planFilter, page]);

  const handleUpdatePlan = async (id: string, plan: string) => {
    try {
      await updateSubscriptionFn({ data: { subscriptionId: id, plan: plan as any } });
      toast.success("Subscription plan updated");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update subscription");
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateSubscriptionFn({ data: { subscriptionId: id, status: status as any } });
      toast.success("Subscription status updated");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update subscription");
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscriptions ({count})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <CreditCard className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-3 font-medium">No subscriptions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>Trial ends</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.companies?.name ?? "—"}</TableCell>
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
                        <Select value={row.status} onValueChange={(v) => handleUpdateStatus(row.id, v)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{row.seats}</TableCell>
                      <TableCell>{formatCurrency(row.monthly_price, "INR")}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.trial_ends_at ? new Date(row.trial_ends_at).toLocaleDateString() : "—"}
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
