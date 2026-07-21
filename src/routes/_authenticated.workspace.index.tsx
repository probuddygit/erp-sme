import { createFileRoute } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowRight, Banknote, Coins, Package, PackageCheck, ShoppingCart, TrendingUp, Wallet,
} from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { useAuth } from "@/lib/auth-context";
import { KpiWidget } from "@/shared/dashboard/KpiWidget";
import { ChartCard } from "@/shared/dashboard/ChartCard";
import { ListWidget } from "@/shared/dashboard/ListWidget";
import {
  cashFlow, customerDistribution, formatINR, monthlySales, purchaseTrend, revenueTrend, topCustomers, topProducts,
} from "@/shared/dashboard/dummy-data";

export const Route = createFileRoute("/_authenticated/workspace/")({
  component: DashboardPage,
});

const PIE_COLORS = ["hsl(220 90% 50%)", "hsl(160 70% 42%)", "hsl(38 92% 50%)", "hsl(280 65% 55%)", "hsl(340 75% 55%)"];

const axisProps = {
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
  axisLine: { stroke: "hsl(var(--border))" },
  tickLine: false,
} as const;

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  padding: "8px 10px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

function DashboardPage() {
  const { profile, company } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={company ? `${company.name} · Executive overview · FY 2025-26` : "Executive overview"}
      />

      {/* KPI ROW */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiWidget label="Revenue MTD" value={formatINR(2540000)} sublabel="vs ₹21.3 L last month" icon={TrendingUp} accent="primary"
          delta={{ value: "+19.2%", positive: true }} spark={revenueTrend.slice(-8).map((r) => r.revenue)} />
        <KpiWidget label="Receivables" value={formatINR(3820000)} sublabel="42 open invoices" icon={Banknote} accent="warning"
          delta={{ value: "+4.1%", positive: false }} spark={[32, 34, 36, 35, 37, 38, 38, 38.2]} />
        <KpiWidget label="Payables" value={formatINR(2140000)} sublabel="18 open bills" icon={Coins} accent="destructive"
          delta={{ value: "-6.8%", positive: true }} spark={[24, 23, 22, 23, 22, 21.5, 21.4, 21.4]} />
        <KpiWidget label="Inventory Value" value={formatINR(8760000)} sublabel="1,284 SKUs on hand" icon={Package} accent="info"
          delta={{ value: "+2.4%", positive: true }} spark={[81, 82, 83, 84, 85, 86, 87, 87.6]} />
        <KpiWidget label="Sales Orders" value="128" sublabel="24 pending dispatch" icon={ShoppingCart} accent="primary"
          delta={{ value: "+11", positive: true }} spark={[92, 98, 104, 110, 116, 120, 124, 128]} />
        <KpiWidget label="Purchase Orders" value="46" sublabel="12 awaiting GRN" icon={PackageCheck} accent="info"
          delta={{ value: "-3", positive: false }} spark={[52, 51, 50, 49, 48, 47, 47, 46]} />
        <KpiWidget label="Low Stock Alerts" value="17" sublabel="4 critical items" icon={AlertTriangle} accent="warning"
          delta={{ value: "+3", positive: false }} spark={[10, 11, 13, 14, 14, 15, 16, 17]} />
        <KpiWidget label="Cash Position" value={formatINR(4620000)} sublabel="Across 3 bank accounts" icon={Wallet} accent="success"
          delta={{ value: "+8.6%", positive: true }} spark={[38, 40, 41, 42, 43, 44, 45, 46.2]} />
      </div>

      {/* MAIN CHART ROW */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Revenue Trend"
          description="Monthly revenue vs. target · FY 2025-26"
          action={<span className="text-xs text-muted-foreground">₹ in Lakhs</span>}
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220 90% 50%)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(220 90% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} width={44} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatINR(v)} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(220 90% 50%)" strokeWidth={2.2} fill="url(#rev)" />
              <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Customer Distribution" description="Revenue share by segment">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={customerDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                {customerDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* SECONDARY CHART ROW */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Monthly Sales" description="Orders count and order value" action={<span className="text-xs text-muted-foreground">Last 6 months</span>}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlySales} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis yAxisId="left" {...axisProps} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} width={44} />
              <YAxis yAxisId="right" orientation="right" {...axisProps} width={36} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="value" name="Order value" fill="hsl(220 90% 50%)" radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="hsl(38 92% 50%)" strokeWidth={2.2} dot={{ r: 3, fill: "hsl(38 92% 50%)" }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Purchase Trend" description="Monthly procurement value" action={<span className="text-xs text-muted-foreground">Last 6 months</span>}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={purchaseTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pur" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160 70% 42%)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(160 70% 42%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} width={44} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatINR(v)} />
              <Area type="monotone" dataKey="value" name="Purchases" stroke="hsl(160 70% 42%)" strokeWidth={2.2} fill="url(#pur)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* THIRD ROW: TOP LISTS + CASH FLOW */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ListWidget
          title="Top Products"
          description="By sales value · this quarter"
          action={<button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all <ArrowRight className="h-3 w-3" /></button>}
          rows={topProducts.map((p) => ({
            key: p.name,
            primary: p.name,
            secondary: `${p.units.toLocaleString("en-IN")} units sold`,
            value: formatINR(p.sales),
            progress: (p.sales / topProducts[0].sales) * 100,
          }))}
        />
        <ListWidget
          title="Top Customers"
          description="By revenue · this quarter"
          action={<button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all <ArrowRight className="h-3 w-3" /></button>}
          rows={topCustomers.map((c) => ({
            key: c.name,
            primary: c.name,
            secondary: `${c.orders} orders`,
            value: formatINR(c.value),
            progress: (c.value / topCustomers[0].value) * 100,
          }))}
        />
        <ChartCard title="Cash Flow" description="Inflow vs outflow · last 6 days">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cashFlow} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatINR(v)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="inflow" name="Inflow" fill="hsl(160 70% 42%)" radius={[6, 6, 0, 0]} maxBarSize={22} />
              <Bar dataKey="outflow" name="Outflow" fill="hsl(0 72% 58%)" radius={[6, 6, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
