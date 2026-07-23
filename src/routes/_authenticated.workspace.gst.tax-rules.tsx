import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Scale } from "lucide-react";
import { TAX_RULES, GST_RATES } from "@/features/gst/data";

export const Route = createFileRoute("/_authenticated/workspace/gst/tax-rules")({
  component: TaxRulesPage,
});

function TaxRulesPage() {
  const rateMap = Object.fromEntries(GST_RATES.map((r) => [r.id, r]));
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Scale className="h-4 w-4" /> Rules resolve the applicable tax slab per line based on scope, supply type and HSN pattern.
          </div>
          <Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> New rule</Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Supply</TableHead>
                <TableHead>HSN pattern</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TAX_RULES.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-muted-foreground">{r.priority}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.scope}</Badge></TableCell>
                  <TableCell className="text-xs capitalize text-muted-foreground">{r.supplyType}</TableCell>
                  <TableCell className="font-mono text-xs">{r.hsnPattern}</TableCell>
                  <TableCell>{rateMap[r.rateId]?.name ?? r.rateId}</TableCell>
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