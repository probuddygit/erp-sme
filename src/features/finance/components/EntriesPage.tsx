import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, Paperclip, MessageSquare, IndianRupee, type LucideIcon } from "lucide-react";
import { StatCard } from "@/shared/components/StatCard";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { StatusBadge } from "./StatusBadge";
import { EntryDrawer } from "./EntryDrawer";
import {
  ENTRY_META, STATUS_TONES, formatDate, formatINR,
  type FinanceEntry,
} from "@/features/finance/data";

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
  data: FinanceEntry[];
  statuses?: string[];
  showParty?: boolean;
  showMode?: boolean;
}

const PAGE_SIZE = 8;
const DEFAULT_STATUSES = ["draft", "pending", "approved", "posted", "rejected", "cancelled"];

export function EntriesPage({ title, description, icon: Icon, data, statuses, showParty, showMode }: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [approval, setApproval] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FinanceEntry | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((e) => {
      if (status && e.status !== status) return false;
      if (approval && e.approvalStatus !== approval) return false;
      if (!term) return true;
      return [e.number, e.narration, e.party ?? "", e.reference ?? ""].some((v) => v.toLowerCase().includes(term));
    });
  }, [data, search, status, approval]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, e) => s + Math.max(e.totalDebit, e.totalCredit), 0);
    const posted = filtered.filter((e) => e.status === "posted").length;
    const pending = filtered.filter((e) => e.approvalStatus === "pending").length;
    return { total, posted, pending, count: filtered.length };
  }, [filtered]);

  const short = ENTRY_META[data[0]?.type ?? "journal"].short;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Entries" value={String(totals.count)} icon={Icon} />
        <StatCard label="Total value" value={formatINR(totals.total)} icon={IndianRupee} />
        <StatCard label="Posted" value={String(totals.posted)} icon={Icon} hint="In ledger" />
        <StatCard label="Pending approval" value={String(totals.pending)} icon={Icon} hint="Awaiting review" />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <FilterBar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            placeholder={`Search ${title.toLowerCase()} by #, party, narration…`}
            filters={[
              {
                key: "status", label: "Status", value: status,
                onChange: (v) => { setStatus(v); setPage(1); },
                options: (statuses ?? DEFAULT_STATUSES).map((s) => ({ value: s, label: s })),
              },
              {
                key: "approval", label: "Approval", value: approval,
                onChange: (v) => { setApproval(v); setPage(1); },
                options: ["draft", "pending", "approved", "rejected"].map((s) => ({ value: s, label: s })),
              },
            ]}
            actions={
              <>
                <Button size="sm" variant="outline"><Download className="mr-1.5 h-4 w-4" />Export</Button>
                <Button size="sm"><Plus className="mr-1.5 h-4 w-4" />New {short}</Button>
              </>
            }
          />

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher</TableHead>
                  <TableHead>Date</TableHead>
                  {showParty && <TableHead>Party</TableHead>}
                  <TableHead>Narration</TableHead>
                  {showMode && <TableHead>Mode</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      No entries match your filters.
                    </TableCell>
                  </TableRow>
                ) : pageData.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(e)}>
                    <TableCell>
                      <div className="font-medium">{e.number}</div>
                      {e.reference && <div className="text-xs text-muted-foreground">Ref: {e.reference}</div>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(e.date)}</TableCell>
                    {showParty && (
                      <TableCell>
                        <div className="text-sm font-medium">{e.party ?? "—"}</div>
                        <div className="text-[11px] text-muted-foreground">{e.partyCode ?? ""}</div>
                      </TableCell>
                    )}
                    <TableCell className="max-w-[320px] truncate text-sm">{e.narration}</TableCell>
                    {showMode && <TableCell className="text-xs uppercase text-muted-foreground">{e.mode ?? "—"}</TableCell>}
                    <TableCell><StatusBadge label={e.status} tone={STATUS_TONES[e.status]} /></TableCell>
                    <TableCell><StatusBadge label={e.approvalStatus} tone={STATUS_TONES[e.approvalStatus]} /></TableCell>
                    <TableCell className="text-right font-medium">{formatINR(Math.max(e.totalDebit, e.totalCredit))}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{e.attachments.length}</span>
                        <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{e.comments.length}</span>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <div>Showing {(pageData.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1)}–{(page - 1) * PAGE_SIZE + pageData.length} of {filtered.length}</div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <span className="px-2">Page {page} / {pageCount}</span>
              <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <EntryDrawer entry={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}