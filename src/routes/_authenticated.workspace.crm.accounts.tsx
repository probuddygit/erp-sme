import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Globe, MapPin, Users2 } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { RecordDrawer, DetailGrid } from "@/features/crm/components/RecordDrawer";
import { ACCOUNTS, formatINR, type Account } from "@/features/crm/data";

export const Route = createFileRoute("/_authenticated/workspace/crm/accounts")({
  component: AccountsPage,
});

const STATUS_TONE: Record<Account["status"], string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  prospect: "bg-blue-50 text-blue-700 border-blue-200",
  churned: "bg-rose-50 text-rose-700 border-rose-200",
};

const INDUSTRY_OPTIONS = Array.from(new Set(ACCOUNTS.map((a) => a.industry))).map((v) => ({ value: v, label: v }));
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "prospect", label: "Prospect" },
  { value: "churned", label: "Churned" },
];

function AccountsPage() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Account | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ACCOUNTS.filter((a) => {
      if (industry && a.industry !== industry) return false;
      if (status && a.status !== status) return false;
      if (!term) return true;
      return [a.name, a.city, a.website].some((v) => v.toLowerCase().includes(term));
    });
  }, [search, industry, status]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search accounts…"
            filters={[
              { key: "industry", label: "Industry", value: industry, onChange: setIndustry, options: INDUSTRY_OPTIONS },
              { key: "status", label: "Status", value: status, onChange: setStatus, options: STATUS_OPTIONS },
            ]}
            actions={<Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New account</Button>}
          />
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">ARR</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No accounts found.</TableCell></TableRow>
                ) : filtered.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(a)}>
                    <TableCell>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.website}</div>
                    </TableCell>
                    <TableCell>{a.industry}</TableCell>
                    <TableCell className="text-sm">{a.city}</TableCell>
                    <TableCell className="text-right">{a.employees}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(a.arr)}</TableCell>
                    <TableCell>{a.owner}</TableCell>
                    <TableCell><StatusBadge label={a.status} tone={STATUS_TONE[a.status]} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RecordDrawer
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={selected ? `${selected.industry} · ${selected.city}` : ""}
        details={
          selected ? (
            <DetailGrid items={[
              { label: "Website",  value: <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-muted-foreground" />{selected.website}</span> },
              { label: "City",     value: <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{selected.city}</span> },
              { label: "Industry", value: selected.industry },
              { label: "Employees",value: <span className="inline-flex items-center gap-1.5"><Users2 className="h-3.5 w-3.5 text-muted-foreground" />{selected.employees}</span> },
              { label: "ARR",      value: formatINR(selected.arr) },
              { label: "Owner",    value: selected.owner },
              { label: "Status",   value: <StatusBadge label={selected.status} tone={STATUS_TONE[selected.status]} /> },
            ]} />
          ) : null
        }
      />
    </div>
  );
}