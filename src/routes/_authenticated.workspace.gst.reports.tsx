import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileBarChart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/gst/reports")({
  component: GstReports,
});

const REPORTS = [
  { key: "sales-register", name: "GST Sales Register", desc: "Invoice-wise output GST for the selected period." },
  { key: "purchase-register", name: "GST Purchase Register", desc: "Invoice-wise input GST claimable." },
  { key: "hsn-summary", name: "HSN-wise Summary", desc: "Consolidated turnover grouped by HSN / SAC." },
  { key: "b2b-invoices", name: "B2B Invoices", desc: "Registered-buyer invoices for GSTR-1 Table 4." },
  { key: "b2c-large", name: "B2C (Large)", desc: "Inter-state supplies to unregistered buyers above ₹2.5 L." },
  { key: "b2c-small", name: "B2C (Small)", desc: "Consolidated intra-state supplies to unregistered buyers." },
  { key: "credit-debit-notes", name: "Credit / Debit Notes", desc: "CDNR / CDNUR records affecting output tax." },
  { key: "itc-01", name: "ITC Reconciliation", desc: "Match purchase register with GSTR-2A / 2B." },
  { key: "gstr-9", name: "GSTR-9 Annual Return", desc: "Consolidated annual return draft — placeholder." },
];

function GstReports() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {REPORTS.map((r) => (
        <Card key={r.key}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileBarChart className="h-4 w-4 text-primary" /> {r.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">{r.desc}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">Open</Button>
              <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
