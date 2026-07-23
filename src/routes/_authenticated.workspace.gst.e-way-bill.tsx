import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/shared/components/StatCard";
import { StatusPill } from "@/features/gst/components/StatusPill";
import { toast } from "sonner";
import { Truck, CheckCircle2, Clock3, XCircle, Loader2 } from "lucide-react";
import { EWAYBILLS, formatDate, formatINR, type EWayBillRow } from "@/features/gst/data";
import { generateEwayBill } from "@/features/gst/api";

export const Route = createFileRoute("/_authenticated/workspace/gst/e-way-bill")({
  component: EWayBillPage,
});

function EWayBillPage() {
  const [rows, setRows] = useState<EWayBillRow[]>(EWAYBILLS);
  const [busy, setBusy] = useState<string | null>(null);

  const totals = {
    active: rows.filter((r) => r.status === "active").length,
    pending: rows.filter((r) => r.status === "pending").length,
    expired: rows.filter((r) => r.status === "expired").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
  };

  async function handleGenerate(row: EWayBillRow) {
    setBusy(row.id);
    try {
      const res = await generateEwayBill({
        invoiceNumber: row.invoiceNumber,
        fromPin: row.fromPin,
        toPin: row.toPin,
        distanceKm: row.distanceKm,
        vehicleNo: row.vehicleNo,
        totalValue: row.totalValue,
      });
      setRows((s) => s.map((r) => r.id === row.id ? { ...r, ewbNo: res.ewbNo, generatedAt: res.ewbDate, validUpto: res.validUpto, status: "active" } : r));
      toast.success(`e-Way bill generated for ${row.invoiceNumber}`);
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active" value={String(totals.active)} icon={CheckCircle2} />
        <StatCard label="Pending" value={String(totals.pending)} icon={Clock3} />
        <StatCard label="Expired" value={String(totals.expired)} icon={XCircle} />
        <StatCard label="Cancelled" value={String(totals.cancelled)} icon={Truck} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>EWB No</TableHead>
                <TableHead>From → To</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Transporter</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Valid upto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.invoiceNumber}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{r.ewbNo ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.fromPin} → {r.toPin}</TableCell>
                  <TableCell className="text-xs">{r.distanceKm} km</TableCell>
                  <TableCell className="font-mono text-xs">{r.vehicleNo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.transporter}</TableCell>
                  <TableCell className="text-right">{formatINR(r.totalValue)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.validUpto ? formatDate(r.validUpto) : "—"}</TableCell>
                  <TableCell><StatusPill label={r.status} /></TableCell>
                  <TableCell className="text-right">
                    {busy === r.id ? (
                      <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
                    ) : r.status === "pending" ? (
                      <Button size="sm" onClick={() => handleGenerate(r)}><Truck className="mr-1 h-3.5 w-3.5" /> Generate</Button>
                    ) : (
                      <span className="text-xs capitalize text-muted-foreground">{r.status}</span>
                    )}
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