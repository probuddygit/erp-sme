import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Download, Paperclip, MessageSquare, type LucideIcon } from "lucide-react";
import {
  APPROVAL_TONES,
  DOC_META,
  STATUS_TONES,
  formatDate,
  formatINR,
  type ApprovalStatus,
  type Transaction,
} from "@/features/sales/data";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { TransactionDrawer } from "@/features/sales/components/TransactionDrawer";
import { StatCard } from "@/shared/components/StatCard";
import { FilterBar } from "@/features/crm/components/FilterBar";

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
  data: Transaction[];
  statuses: string[];
  extraColumns?: { header: string; render: (t: Transaction) => React.ReactNode }[];
  kpi?: {
    label: string;
    value: string;
    hint?: string;
  }[];
}

const APPROVAL_OPTIONS: { value: ApprovalStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const PAGE_SIZE = 8;

export function TransactionsPage({
  title,
  description,
  icon: Icon,
  data,
  statuses,
  extraColumns = [],
  kpi,
}: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [approval, setApproval] = useState("");
  const [rep, setRep] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const reps = useMemo(() => Array.from(new Set(data.map((t) => t.ownerRep))), [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((t) => {
      if (status && t.status !== status) return false;
      if (approval && t.approvalStatus !== approval) return false;
      if (rep && t.ownerRep !== rep) return false;
      if (!term) return true;
      return [t.number, t.customer, t.reference ?? "", t.ownerRep].some((v) =>
        v.toLowerCase().includes(term),
      );
    });
  }, [data, search, status, approval, rep]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, t) => s + t.grandTotal, 0);
    const pending = filtered.filter((t) => t.approvalStatus === "pending").length;
    return { total, pending, count: filtered.length };
  }, [filtered]);

  const kpis = kpi ?? [
    { label: "Records", value: String(totals.count) },
    { label: "Total value", value: formatINR(totals.total) },
    { label: "Pending approval", value: String(totals.pending) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} icon={Icon} hint={k.hint} />
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <FilterBar
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={`Search ${title.toLowerCase()} by #, customer, reference…`}
            filters={[
              {
                key: "status",
                label: "Status",
                value: status,
                onChange: (v) => {
                  setStatus(v);
                  setPage(1);
                },
                options: statuses.map((s) => ({ value: s, label: s.replace(/_/g, " ") })),
              },
              {
                key: "approval",
                label: "Approval",
                value: approval,
                onChange: (v) => {
                  setApproval(v);
                  setPage(1);
                },
                options: APPROVAL_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
              },
              {
                key: "rep",
                label: "Rep",
                value: rep,
                onChange: (v) => {
                  setRep(v);
                  setPage(1);
                },
                options: reps.map((r) => ({ value: r, label: r })),
              },
            ]}
            actions={
              <>
                <Button size="sm" variant="outline">
                  <Download className="mr-1.5 h-4 w-4" /> Export
                </Button>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> New {DOC_META[data[0]?.docType]?.short ?? "record"}
                </Button>
              </>
            }
          />

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Rep</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  {extraColumns.map((c) => (
                    <TableHead key={c.header}>{c.header}</TableHead>
                  ))}
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9 + extraColumns.length} className="py-10 text-center text-muted-foreground">
                      No records match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageData.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(t)}
                    >
                      <TableCell>
                        <div className="font-medium">{t.number}</div>
                        {t.reference && (
                          <div className="text-xs text-muted-foreground">Ref: {t.reference}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{t.customer}</div>
                        <div className="text-xs text-muted-foreground">{t.customerCode}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(t.date)}</TableCell>
                      <TableCell className="text-sm">{t.ownerRep}</TableCell>
                      <TableCell>
                        <StatusBadge label={t.status.replace(/_/g, " ")} tone={STATUS_TONES[t.status]} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={t.approvalStatus} tone={APPROVAL_TONES[t.approvalStatus]} />
                      </TableCell>
                      {extraColumns.map((c) => (
                        <TableCell key={c.header} className="text-sm">
                          {c.render(t)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium">
                        {formatINR(t.paymentAmount ?? t.grandTotal)}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center gap-0.5">
                            <Paperclip className="h-3 w-3" />
                            {t.attachments.length}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <MessageSquare className="h-3 w-3" />
                            {t.comments.length}
                          </span>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <div>
              Showing {(pageData.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1)}–
              {(page - 1) * PAGE_SIZE + pageData.length} of {filtered.length}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <span className="px-2">Page {page} / {pageCount}</span>
              <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <TransactionDrawer
        transaction={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />

      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}