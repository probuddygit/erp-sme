import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt, Wallet, Bell } from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/lib/sales-utils";
import { RowActions } from "@/components/RowActions";
import type { Database } from "@/integrations/supabase/types";

type IStatus = Database["public"]["Enums"]["invoice_status"];
type PMethod = Database["public"]["Enums"]["payment_method"];

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: IStatus;
  invoice_date: string;
  due_date: string | null;
  grand_total: number;
  amount_paid: number;
  amount_due: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  customers: { name: string; email: string | null } | null;
}

const STATUS_VARIANT: Record<IStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  partially_paid: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  paid: "bg-green-500/15 text-green-600 dark:text-green-400",
  overdue: "bg-red-500/15 text-red-600 dark:text-red-400",
  cancelled: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/_authenticated/app/sales/invoices")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const { company, isCompanyAdmin, hasRole } = useAuth();
  const qc = useQueryClient();
  const [paying, setPaying] = useState<InvoiceRow | null>(null);
  const canPay = isCompanyAdmin || hasRole("finance");

  const { data: invoices, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["invoices", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id,invoice_number,status,invoice_date,due_date,grand_total,amount_paid,amount_due,cgst_total,sgst_total,igst_total,customers(name,email)")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as InvoiceRow[];
    },
  });

  const send = async (id: string) => {
    const { error } = await supabase.from("invoices").update({ status: "sent" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Invoice marked sent"); qc.invalidateQueries({ queryKey: ["invoices", company?.id] }); }
  };

  const remind = async (inv: InvoiceRow) => {
    const { error } = await supabase.from("invoices").update({ last_reminder_at: new Date().toISOString() }).eq("id", inv.id);
    if (error) return toast.error(error.message);
    toast.success(`Reminder logged${inv.customers?.email ? ` for ${inv.customers.email}` : ""}`);
    qc.invalidateQueries({ queryKey: ["invoices", company?.id] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>}
              {!isLoading && (invoices ?? []).length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  <Receipt className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  No invoices yet
                </TableCell></TableRow>
              )}
              {(invoices ?? []).map((inv) => {
                const overdue = inv.due_date && inv.amount_due > 0 && new Date(inv.due_date) < new Date();
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.customers?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{inv.invoice_date}</TableCell>
                    <TableCell className={overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}>{inv.due_date ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className={STATUS_VARIANT[inv.status]}>{inv.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{inr(inv.grand_total)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{inr(inv.amount_paid)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{inr(inv.amount_due)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {canPay && inv.status === "draft" && (
                        <Button size="sm" variant="ghost" onClick={() => send(inv.id)}>Send</Button>
                      )}
                      {canPay && inv.amount_due > 0 && inv.status !== "draft" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setPaying(inv)}>
                            <Wallet className="h-3.5 w-3.5 mr-1" />Pay
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => remind(inv)}>
                            <Bell className="h-3.5 w-3.5 mr-1" />Remind
                          </Button>
                        </>
                      )}
                      {canPay && inv.status === "draft" && (
                        <RowActions
                          label={`invoice ${inv.invoice_number}`}
                          invalidateKeys={[["invoices", company?.id]]}
                          onDelete={async () => {
                            await supabase.from("invoice_items").delete().eq("invoice_id", inv.id);
                            const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
                            if (error) throw error;
                          }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        {paying && (
          <PaymentDialog
            invoice={paying}
            onClose={() => setPaying(null)}
            onSaved={() => {
              setPaying(null);
              qc.invalidateQueries({ queryKey: ["invoices", company?.id] });
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function PaymentDialog({ invoice, onClose, onSaved }: { invoice: InvoiceRow; onClose: () => void; onSaved: () => void }) {
  const { company, user } = useAuth();
  const [amount, setAmount] = useState<number>(Number(invoice.amount_due));
  const [method, setMethod] = useState<PMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!company?.id) return;
    if (amount <= 0) return toast.error("Amount must be greater than 0");
    if (amount > invoice.amount_due + 0.01) return toast.error(`Maximum: ${inr(invoice.amount_due)}`);
    setSaving(true);
    const { error } = await supabase.from("payments").insert({
      company_id: company.id,
      invoice_id: invoice.id,
      amount,
      method,
      payment_date: date,
      reference: reference || null,
      created_by: user?.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Payment recorded");
    onSaved();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Record payment · {invoice.invoice_number}</DialogTitle></DialogHeader>
      <div className="text-sm text-muted-foreground mb-2">
        Outstanding: <span className="font-semibold text-foreground">{inr(invoice.amount_due)}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount (₹)"><Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Method">
          <Select value={method} onValueChange={(v) => setMethod(v as PMethod)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["bank_transfer", "upi", "cheque", "cash", "card", "other"] as PMethod[]).map((m) => (
                <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Reference"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / Cheque #" /></Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Record"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
