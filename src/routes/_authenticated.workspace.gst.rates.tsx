import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Percent } from "lucide-react";
import { GST_RATES, formatDate } from "@/features/gst/data";

export const Route = createFileRoute("/_authenticated/workspace/gst/rates")({
  component: GstRatesPage,
});

function GstRatesPage() {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Percent className="h-4 w-4" /> Statutory slabs — split into CGST + SGST for intra-state and full IGST for inter-state supplies.
          </div>
          <Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> New rate</Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">Cess</TableHead>
                <TableHead>Effective from</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {GST_RATES.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right">{r.rate}%</TableCell>
                  <TableCell className="text-right">{r.cgst}%</TableCell>
                  <TableCell className="text-right">{r.sgst}%</TableCell>
                  <TableCell className="text-right">{r.igst}%</TableCell>
                  <TableCell className="text-right">{r.cess ? `${r.cess}%` : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.effectiveFrom)}</TableCell>
                  <TableCell><Badge variant={r.active ? "secondary" : "outline"}>{r.active ? "Active" : "Inactive"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}