import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarCheck, Wallet, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/hr/")({
  component: HRDashboard,
});

function HRDashboard() {
  const { company } = useAuth();
  const [stats, setStats] = useState({ employees: 0, presentToday: 0, lastNet: 0, ytdGross: 0 });
  const [recent, setRecent] = useState<Array<{ id: string; run_number: string; pay_date: string; total_net: number; status: string }>>([]);

  useEffect(() => {
    if (!company?.id) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const year = new Date().getFullYear();
      const [{ count: empCount }, { count: presCount }, { data: runs }] = await Promise.all([
        supabase.from("employees").select("*", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "active"),
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("company_id", company.id).eq("attendance_date", today).in("status", ["present", "half_day"]),
        supabase.from("payroll_runs").select("id,run_number,pay_date,total_net,total_gross,status,period_year").eq("company_id", company.id).order("pay_date", { ascending: false }).limit(10),
      ]);
      const ytd = (runs ?? []).filter((r) => r.period_year === year).reduce((s, r) => s + Number(r.total_gross || 0), 0);
      const lastNet = runs?.[0]?.total_net ?? 0;
      setStats({ employees: empCount ?? 0, presentToday: presCount ?? 0, lastNet: Number(lastNet), ytdGross: ytd });
      setRecent(runs ?? []);
    })();
  }, [company?.id]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={Users} label="Active employees" value={stats.employees.toString()} />
        <Stat icon={CalendarCheck} label="Present today" value={stats.presentToday.toString()} />
        <Stat icon={Wallet} label="Last payroll net" value={`₹ ${stats.lastNet.toLocaleString("en-IN")}`} />
        <Stat icon={TrendingUp} label="YTD gross paid" value={`₹ ${stats.ytdGross.toLocaleString("en-IN")}`} />
      </div>
      <Card>
        <CardHeader><CardTitle>Recent payroll runs</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payroll runs yet. <Link to="/app/hr/payroll" className="text-accent underline">Create one</Link>.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{r.run_number}</div>
                    <div className="text-xs text-muted-foreground">{r.pay_date} · {r.status}</div>
                  </div>
                  <div className="font-mono text-sm">₹ {Number(r.total_net).toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}