import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, Search } from "lucide-react";
import { HSN_CODES } from "@/features/gst/data";

export const Route = createFileRoute("/_authenticated/workspace/gst/hsn")({
  component: HsnMaster,
});

function HsnMaster() {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? HSN_CODES.filter((h) => [h.code, h.description, h.chapter].some((v) => v.toLowerCase().includes(t))) : HSN_CODES;
  }, [q]);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search HSN / SAC by code, description or chapter…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" variant="outline"><Download className="mr-1.5 h-4 w-4" /> Export</Button>
          <Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> New HSN</Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HSN / SAC</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">GST %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono font-medium">{h.code}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{h.chapter}</TableCell>
                  <TableCell>{h.description}</TableCell>
                  <TableCell><Badge variant={h.type === "goods" ? "secondary" : "outline"} className="capitalize">{h.type}</Badge></TableCell>
                  <TableCell className="text-xs uppercase text-muted-foreground">{h.uom}</TableCell>
                  <TableCell className="text-right font-medium">{h.gstRate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}