import { createFileRoute, Link } from "@tanstack/react-router";
import { Users2, UserRound, Building2, Trophy, BellRing, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/shared/components/StatCard";
import { LEADS, CONTACTS, ACCOUNTS, OPPORTUNITIES, FOLLOW_UPS, EMAILS, formatINR, LEAD_STATUSES } from "@/features/crm/data";
import { StatusBadge } from "@/features/crm/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/workspace/crm/")({
  component: CrmOverview,
});

function CrmOverview() {
  const pipelineValue = OPPORTUNITIES.filter((o) => !o.stage.startsWith("closed")).reduce((s, o) => s + o.value, 0);
  const openFollowUps = FOLLOW_UPS.filter((f) => !f.done).length;
  const unread = EMAILS.filter((e) => !e.opened).length;

  const byStatus = LEAD_STATUSES.map((s) => ({
    ...s,
    count: LEADS.filter((l) => l.status === s.key).length,
  }));
  const maxCount = Math.max(1, ...byStatus.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users2}     label="Leads"          value={LEADS.length}        hint={`${LEADS.filter((l) => l.status === "new").length} new`} />
        <StatCard icon={UserRound}  label="Contacts"       value={CONTACTS.length}     hint={`${CONTACTS.filter((c) => c.tags.includes("decision-maker")).length} decision makers`} />
        <StatCard icon={Building2}  label="Accounts"       value={ACCOUNTS.length}     hint={`${ACCOUNTS.filter((a) => a.status === "active").length} active`} />
        <StatCard icon={Trophy}     label="Open pipeline"  value={formatINR(pipelineValue)} hint={`${OPPORTUNITIES.filter((o) => !o.stage.startsWith("closed")).length} opportunities`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Leads by status</div>
                <div className="text-xs text-muted-foreground">Distribution across the sales funnel.</div>
              </div>
              <Link to="/workspace/crm/leads" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {byStatus.map((s) => (
                <div key={s.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <StatusBadge label={s.label} tone={s.tone} />
                    <span className="text-muted-foreground">{s.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{openFollowUps}</div>
                  <div className="text-xs text-muted-foreground">Open follow-ups</div>
                </div>
              </div>
              <Link to="/workspace/crm/follow-ups" className="mt-3 block text-xs font-medium text-primary hover:underline">Review queue →</Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{unread}</div>
                  <div className="text-xs text-muted-foreground">Unread emails</div>
                </div>
              </div>
              <Link to="/workspace/crm/email-history" className="mt-3 block text-xs font-medium text-primary hover:underline">Open inbox →</Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}