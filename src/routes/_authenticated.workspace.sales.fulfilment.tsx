import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Boxes, PackageCheck, Truck, Lock, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  usePickLists,
  useSavePickedQty,
  useSetPickListStatus,
  useCreatePackingSlip,
  usePackingSlips,
  useDispatches,
  useSaveDispatch,
  useMarkDispatched,
  useReservations,
  useReleaseReservation,
} from "@/features/sales/fulfilment-api";
import { useDeliveryNotes } from "@/features/sales/api";

export const Route = createFileRoute("/_authenticated/workspace/sales/fulfilment")({
  component: FulfilmentPage,
  head: () => ({
    meta: [
      { title: "Fulfilment — Pick, Pack & Dispatch | Ind Guru ERP" },
      { name: "description", content: "Warehouse fulfilment for sales orders: reservations, pick lists, packing slips and dispatches with automatic stock and COGS posting." },
      { property: "og:title", content: "Fulfilment — Pick, Pack & Dispatch | Ind Guru ERP" },
      { property: "og:description", content: "Reserve stock, pick, pack and dispatch sales orders with automatic inventory and cost posting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function FulfilmentPage() {
  return (
    <Tabs defaultValue="pick" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pick"><Boxes className="mr-1.5 h-3.5 w-3.5" />Pick Lists</TabsTrigger>
        <TabsTrigger value="pack"><PackageCheck className="mr-1.5 h-3.5 w-3.5" />Packing Slips</TabsTrigger>
        <TabsTrigger value="dispatch"><Truck className="mr-1.5 h-3.5 w-3.5" />Dispatches</TabsTrigger>
        <TabsTrigger value="reservations"><Lock className="mr-1.5 h-3.5 w-3.5" />Reservations</TabsTrigger>
      </TabsList>
      <TabsContent value="pick"><PickLists /></TabsContent>
      <TabsContent value="pack"><PackingSlips /></TabsContent>
      <TabsContent value="dispatch"><Dispatches /></TabsContent>
      <TabsContent value="reservations"><Reservations /></TabsContent>
    </Tabs>
  );
}

function PickLists() {
  const { data = [], isLoading } = usePickLists();
  const savePicked = useSavePickedQty();
  const setStatus = useSetPickListStatus();
  const pack = useCreatePackingSlip();
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pick Lists</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pick No</TableHead>
              <TableHead>Sales Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">Lines</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                No pick lists — confirm a sales order to generate one.
              </TableCell></TableRow>
            )}
            {(data as any[]).map((p) => (
              <>
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.pick_no}</TableCell>
                  <TableCell>{p.order?.order_number ?? "—"}</TableCell>
                  <TableCell>{p.order?.customer?.name ?? "—"}</TableCell>
                  <TableCell>{p.warehouse?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.items?.length ?? 0}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] capitalize">{p.status}</Badge></TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(openId === p.id ? null : p.id)}>
                      {openId === p.id ? "Hide" : "Pick"}
                    </Button>
                    {p.status !== "packed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pack.isPending}
                        onClick={() => pack.mutate({ pick_list_id: p.id, sales_order_id: p.sales_order_id, packages: 1 })}
                      >
                        <PackageCheck className="mr-1 h-3.5 w-3.5" />Pack
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {openId === p.id && (
                  <TableRow key={`${p.id}-lines`}>
                    <TableCell colSpan={7} className="bg-muted/40">
                      <div className="space-y-2 py-2">
                        {(p.items ?? []).map((l: any) => (
                          <div key={l.id} className="flex items-center gap-3 text-sm">
                            <span className="w-64 truncate">{l.item?.name ?? "Item"}</span>
                            <span className="text-muted-foreground">Req {Number(l.qty_requested)}</span>
                            <Input
                              type="number"
                              className="h-8 w-28"
                              defaultValue={Number(l.qty_picked)}
                              onChange={(e) => setEdits((s) => ({ ...s, [l.id]: Number(e.target.value) }))}
                            />
                            <span className="text-muted-foreground">{l.item?.unit ?? ""}</span>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            disabled={savePicked.isPending}
                            onClick={() => {
                              const lines = (p.items ?? [])
                                .filter((l: any) => edits[l.id] !== undefined)
                                .map((l: any) => ({ id: l.id, qty_picked: edits[l.id]! }));
                              if (lines.length) savePicked.mutate(lines);
                            }}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />Save picked
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: p.id, status: "picked" })}>
                            Mark picked
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PackingSlips() {
  const { data = [], isLoading } = usePackingSlips();
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Packing Slips</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pack No</TableHead>
              <TableHead>Pick List</TableHead>
              <TableHead>Sales Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Packages</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && data.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No packing slips yet.</TableCell></TableRow>
            )}
            {(data as any[]).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.pack_no}</TableCell>
                <TableCell>{s.pick_list?.pick_no ?? "—"}</TableCell>
                <TableCell>{s.order?.order_number ?? "—"}</TableCell>
                <TableCell>{s.order?.customer?.name ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{s.packages}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] capitalize">{s.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Dispatches() {
  const { data = [], isLoading } = useDispatches();
  const { data: slips = [] } = usePackingSlips();
  const { data: dns = [] } = useDeliveryNotes();
  const save = useSaveDispatch();
  const markDispatched = useMarkDispatched();
  const [form, setForm] = useState({ packing_slip_id: "", delivery_note_id: "", vehicle_no: "", transporter_name: "" });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Plan a dispatch</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">Packing slip</span>
            <select
              className="h-9 w-52 rounded-md border border-input bg-background px-2 text-sm"
              value={form.packing_slip_id}
              onChange={(e) => setForm({ ...form, packing_slip_id: e.target.value })}
            >
              <option value="">Select…</option>
              {(slips as any[]).map((s) => <option key={s.id} value={s.id}>{s.pack_no}</option>)}
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted-foreground">Delivery note</span>
            <select
              className="h-9 w-52 rounded-md border border-input bg-background px-2 text-sm"
              value={form.delivery_note_id}
              onChange={(e) => setForm({ ...form, delivery_note_id: e.target.value })}
            >
              <option value="">Select…</option>
              {(dns as any[]).map((d) => <option key={d.id} value={d.id}>{d.dn_no}</option>)}
            </select>
          </label>
          <Input className="h-9 w-40" placeholder="Vehicle no" value={form.vehicle_no} onChange={(e) => setForm({ ...form, vehicle_no: e.target.value })} />
          <Input className="h-9 w-48" placeholder="Transporter" value={form.transporter_name} onChange={(e) => setForm({ ...form, transporter_name: e.target.value })} />
          <Button
            disabled={save.isPending}
            onClick={() => {
              const slip = (slips as any[]).find((s) => s.id === form.packing_slip_id);
              save.mutate(
                {
                  packing_slip_id: form.packing_slip_id || null,
                  delivery_note_id: form.delivery_note_id || null,
                  sales_order_id: slip?.sales_order_id ?? null,
                  vehicle_no: form.vehicle_no,
                  transporter_name: form.transporter_name,
                },
                { onSuccess: () => setForm({ packing_slip_id: "", delivery_note_id: "", vehicle_no: "", transporter_name: "" }) },
              );
            }}
          >
            <Truck className="mr-1.5 h-3.5 w-3.5" />Create dispatch
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispatch No</TableHead>
                <TableHead>Sales Order</TableHead>
                <TableHead>Delivery Note</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Transporter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && data.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">No dispatches planned.</TableCell></TableRow>
              )}
              {(data as any[]).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.dispatch_no}</TableCell>
                  <TableCell>{d.order?.order_number ?? "—"}</TableCell>
                  <TableCell>{d.delivery_note?.dn_no ?? "—"}</TableCell>
                  <TableCell>{d.vehicle_no ?? "—"}</TableCell>
                  <TableCell>{d.transporter_name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] capitalize">{d.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {d.status !== "dispatched" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={markDispatched.isPending}
                        onClick={() => markDispatched.mutate({ id: d.id, delivery_note_id: d.delivery_note_id })}
                      >
                        <Truck className="mr-1 h-3.5 w-3.5" />Dispatch
                      </Button>
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

function Reservations() {
  const { data = [], isLoading } = useReservations();
  const release = useReleaseReservation();
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Stock Reservations</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Sales Order</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Consumed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">No reservations.</TableCell></TableRow>
            )}
            {(data as any[]).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.item?.name ?? "—"}</TableCell>
                <TableCell>{r.warehouse?.name ?? "—"}</TableCell>
                <TableCell>{r.order?.order_number ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(r.qty)}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(r.qty_consumed)}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] capitalize">{r.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {r.status === "active" && (
                    <Button size="sm" variant="ghost" disabled={release.isPending} onClick={() => release.mutate(r.id)}>
                      Release
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
