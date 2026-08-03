import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatCard } from "@/shared/components/StatCard";
import { StatusPill } from "@/features/gst/components/StatusPill";
import { toast } from "sonner";
import { Truck, CheckCircle2, Clock3, Download, Loader2 } from "lucide-react";
import { formatDate } from "@/features/gst/data";
import { generateEwayBill } from "@/features/gst/api";
import { useEwayBills, downloadCsv, type EwayLive } from "@/features/gst/gst-api";

export const Route = createFileRoute("/_authenticated/workspace/gst/e-way-bill")({
  component: EWayBillPage,
});

function EWayBillPage() {
  const { rows, isLoading, patch } = useEwayBills();
  const [busy, setBusy] = useState<string | null>(null);
  const [target, setTarget] = useState<EwayLive | null>(null);
  const [form, setForm] = useState({ fromPin: "", toPin: "", distanceKm: 100, vehicleNo: "", transporter: "" });

  const totals = {
    active: rows.filter((r) => !!r.eway_bill_no).length,
    pending: rows.filter((r) => !r.eway_bill_no).length,
    total: rows.length,
  };

  function openGenerate(row: EwayLive) {
    setTarget(row);
    setForm({ fromPin: "", toPin: "", distanceKm: 100, vehicleNo: row.vehicle_no ?? "", transporter: row.transporter_name ?? "" });
  }

  async function handleGenerate() {
    if (!target) return;
    setBusy(target.id);
    try {
      const res = await generateEwayBill({
        invoiceNumber: target.dn_no,
        fromPin: form.fromPin,
        toPin: form.toPin,
        distanceKm: Number(form.distanceKm),
        vehicleNo: form.vehicleNo,
        totalValue: 0,
      });
      await patch({
        id: target.id,
        values: {
          eway_bill_no: res.ewbNo,
          vehicle_no: form.vehicleNo || target.vehicle_no,
          transporter_name: form.transporter || target.transporter_name,
        },
      });
      toast.success(`e-Way bill ${res.ewbNo} generated for ${target.dn_no}`);
      setTarget(null);
    } finally { setBusy(null); }
  }

  async function handleCancel(row: EwayLive) {
    if (!confirm(`Cancel e-Way bill ${row.eway_bill_no}?`)) return;
    setBusy(row.id);
    try {
      await patch({ id: row.id, values: { eway_bill_no: null } });
      toast.success("e-Way bill cancelled");
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Delivery notes" value={String(totals.total)} icon={Truck} />
        <StatCard label="EWB generated" value={String(totals.active)} icon={CheckCircle2} />
        <StatCard label="Pending" value={String(totals.pending)} icon={Clock3} />
        <StatCard label="Coverage" value={`${totals.total ? Math.round((totals.active / totals.total) * 100) : 0}%`} icon={Truck} />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => downloadCsv("e-way-bills.csv", rows.map((r) => ({
              delivery_note: r.dn_no, date: r.delivery_date, customer: r.customers?.name ?? "",
              vehicle: r.vehicle_no ?? "", transporter: r.transporter_name ?? "", ewb_no: r.eway_bill_no ?? "",
            })))}><Download className="mr-1.5 h-4 w-4" /> Export</Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery note</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Transporter</TableHead>
                  <TableHead>EWB No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No delivery notes yet — create one in Sales to raise an e-Way bill.</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.dn_no}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(r.delivery_date)}</TableCell>
                    <TableCell>{r.customers?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.vehicle_no ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.transporter_name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{r.eway_bill_no ?? "—"}</TableCell>
                    <TableCell><StatusPill label={r.eway_bill_no ? "active" : "pending"} /></TableCell>
                    <TableCell className="text-right">
                      {busy === r.id ? (
                        <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
                      ) : r.eway_bill_no ? (
                        <Button size="sm" variant="outline" onClick={() => handleCancel(r)}>Cancel</Button>
                      ) : (
                        <Button size="sm" onClick={() => openGenerate(r)}><Truck className="mr-1 h-3.5 w-3.5" /> Generate</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate e-Way bill — {target?.dn_no}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>From PIN</Label><Input value={form.fromPin} onChange={(e) => setForm({ ...form, fromPin: e.target.value })} placeholder="560001" /></div>
            <div><Label>To PIN</Label><Input value={form.toPin} onChange={(e) => setForm({ ...form, toPin: e.target.value })} placeholder="400001" /></div>
            <div><Label>Distance (km)</Label><Input type="number" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: Number(e.target.value) })} /></div>
            <div><Label>Vehicle no</Label><Input value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value.toUpperCase() })} className="font-mono" /></div>
            <div className="sm:col-span-2"><Label>Transporter</Label><Input value={form.transporter} onChange={(e) => setForm({ ...form, transporter: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={!form.fromPin || !form.toPin || !form.vehicleNo || !!busy}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
