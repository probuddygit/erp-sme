import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/shared/components/PageHeader";
import { RowActions } from "@/components/RowActions";
import { inr } from "@/lib/sales-utils";
import {
  useInvoices,
  useCreditNotes,
  useCreateCreditNote,
  useDeleteCreditNote,
  type CreditNoteLineInput,
} from "@/features/sales/api";

export const Route = createFileRoute("/_authenticated/workspace/sales/credit-notes")({
  component: CreditNotesPage,
});

const REASONS = [
  { value: "return", label: "Return" },
  { value: "pricing", label: "Pricing correction" },
  { value: "discount", label: "Discount" },
  { value: "cancellation", label: "Cancellation" },
] as const;

function CreditNotesPage() {
  const { data: notes = [], isLoading } = useCreditNotes();
  const { data: invoices = [] } = useInvoices();
  const create = useCreateCreditNote();
  const del = useDeleteCreditNote();
  const [open, setOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [reason, setReason] = useState<"return" | "pricing" | "discount" | "cancellation">("return");
  const [cnDate, setCnDate] = useState(new Date().toISOString().slice(0, 10));
  const [notesText, setNotesText] = useState("");
  const [lines, setLines] = useState<CreditNoteLineInput[]>([
    { product_name: "", qty: 1, rate: 0, tax_percent: 18 },
  ]);

  const selectedInvoice = useMemo(
    () => (invoices as any[]).find((i) => i.id === invoiceId),
    [invoices, invoiceId],
  );

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
    const tax = lines.reduce((s, l) => s + l.qty * l.rate * (l.tax_percent / 100), 0);
    return { subtotal, tax, total: subtotal + tax };
  }, [lines]);

  const resetForm = () => {
    setInvoiceId("");
    setReason("return");
    setCnDate(new Date().toISOString().slice(0, 10));
    setNotesText("");
    setLines([{ product_name: "", qty: 1, rate: 0, tax_percent: 18 }]);
  };

  const loadInvoiceLines = (id: string) => {
    setInvoiceId(id);
    const inv = (invoices as any[]).find((i) => i.id === id);
    if (inv?.items?.length) {
      setLines(
        inv.items.map((it: any) => ({
          invoice_item_id: it.id,
          product_name: it.product_name,
          qty: Number(it.quantity),
          rate: Number(it.unit_price),
          tax_percent: Number(it.tax_percent ?? 0),
        })),
      );
    }
  };

  const submit = async () => {
    if (!invoiceId) return;
    await create.mutateAsync({
      invoice_id: invoiceId,
      cn_date: cnDate,
      reason,
      notes: notesText || undefined,
      lines: lines.filter((l) => l.product_name && l.qty > 0),
    });
    setOpen(false);
    resetForm();
  };

  return (
    <>
      <PageHeader
        title="Credit Notes"
        description="Reverse invoices for returns, price corrections, discounts or cancellations."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Credit Note
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && notes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No credit notes yet
                  </TableCell>
                </TableRow>
              )}
              {(notes as any[]).map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.cn_number}</TableCell>
                  <TableCell className="text-muted-foreground">{n.cn_date}</TableCell>
                  <TableCell className="font-mono text-xs">{n.invoice?.invoice_number ?? "—"}</TableCell>
                  <TableCell>{n.invoice?.customer?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {n.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{inr(n.total)}</TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      label={`credit note ${n.cn_number}`}
                      invalidateKeys={[["sales", "credit_notes"]]}
                      onDelete={async () => {
                        await del.mutateAsync(n.id);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Credit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Invoice</Label>
                <Select value={invoiceId} onValueChange={loadInvoiceLines}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {(invoices as any[]).map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.invoice_number} — {i.customer?.name ?? "—"} ({inr(i.grand_total)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Select value={reason} onValueChange={(v) => setReason(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={cnDate} onChange={(e) => setCnDate(e.target.value)} />
              </div>
              {selectedInvoice && (
                <div className="text-xs text-muted-foreground self-end">
                  Original invoice total: <span className="font-medium">{inr(selectedInvoice.grand_total)}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lines</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setLines([...lines, { product_name: "", qty: 1, rate: 0, tax_percent: 18 }])
                  }
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add line
                </Button>
              </div>
              {lines.map((l, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-5"
                    placeholder="Product"
                    value={l.product_name}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...l, product_name: e.target.value };
                      setLines(next);
                    }}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Qty"
                    value={l.qty}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...l, qty: Number(e.target.value) };
                      setLines(next);
                    }}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Rate"
                    value={l.rate}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...l, rate: Number(e.target.value) };
                      setLines(next);
                    }}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Tax %"
                    value={l.tax_percent}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...l, tax_percent: Number(e.target.value) };
                      setLines(next);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="col-span-1 h-9 w-9"
                    onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{inr(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST adjustment</span><span className="tabular-nums">{inr(totals.tax)}</span></div>
              <div className="mt-1 flex justify-between font-medium"><span>Total credit</span><span className="tabular-nums">{inr(totals.total)}</span></div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={notesText} onChange={(e) => setNotesText(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!invoiceId || create.isPending}>
              {create.isPending ? "Saving…" : "Create Credit Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}