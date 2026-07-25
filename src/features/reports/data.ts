import {
  TrendingUp, Wallet, Boxes, Truck, Users2, Receipt, LineChart, Activity,
  Wrench, FolderOpen, Star, Sparkles, type LucideIcon,
} from "lucide-react";

export type ReportCategoryKey =
  | "sales" | "finance" | "inventory" | "purchase" | "crm"
  | "gst" | "management" | "operational" | "custom" | "saved" | "ai-insights";

export interface ReportCategory {
  key: ReportCategoryKey;
  label: string;
  icon: LucideIcon;
  description: string;
  accent: string; // tailwind color for accent tag
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  { key: "sales",        label: "Sales Reports",       icon: TrendingUp, description: "Revenue, pipeline, salesperson & customer analytics.", accent: "text-emerald-600 bg-emerald-500/10" },
  { key: "finance",      label: "Finance Reports",     icon: Wallet,     description: "Ledgers, statements, ageing & cost-centre analysis.",  accent: "text-blue-600 bg-blue-500/10" },
  { key: "inventory",    label: "Inventory Reports",   icon: Boxes,      description: "Stock, valuation, ageing & movement insights.",       accent: "text-amber-600 bg-amber-500/10" },
  { key: "purchase",     label: "Purchase Reports",    icon: Truck,      description: "Vendor, PO, GRN & price-variance intelligence.",       accent: "text-orange-600 bg-orange-500/10" },
  { key: "crm",          label: "CRM Reports",         icon: Users2,     description: "Leads, funnels, acquisition & customer activity.",     accent: "text-fuchsia-600 bg-fuchsia-500/10" },
  { key: "gst",          label: "GST Reports",         icon: Receipt,    description: "GSTR filings, HSN, ITC, e-Invoice & e-Way Bill.",      accent: "text-rose-600 bg-rose-500/10" },
  { key: "management",   label: "Management Reports",  icon: LineChart,  description: "CEO/CFO dashboards & executive KPIs.",                 accent: "text-indigo-600 bg-indigo-500/10" },
  { key: "operational",  label: "Operational Reports", icon: Activity,   description: "Day-to-day operations across every module.",           accent: "text-teal-600 bg-teal-500/10" },
  { key: "custom",       label: "Custom Reports",      icon: Wrench,     description: "Drag-and-drop report builder.",                        accent: "text-slate-600 bg-slate-500/10" },
  { key: "saved",        label: "Saved Reports",       icon: FolderOpen, description: "Your saved & scheduled reports.",                      accent: "text-cyan-600 bg-cyan-500/10" },
  { key: "ai-insights",  label: "AI Insights",         icon: Sparkles,   description: "Ask questions in natural language.",                   accent: "text-violet-600 bg-violet-500/10" },
];

export type ReportKind = "table" | "chart" | "pivot" | "statement";

export interface ReportDef {
  id: string;
  category: ReportCategoryKey;
  name: string;
  description: string;
  tags?: string[];
  favourite?: boolean;
  kind?: ReportKind;
}

export const REPORTS: ReportDef[] = [
  // Sales
  { id: "sales-register",       category: "sales", name: "Sales Register",         description: "Invoice-wise sales for the selected period." , favourite: true },
  { id: "sales-by-customer",    category: "sales", name: "Sales by Customer",      description: "Revenue and margin grouped by customer." },
  { id: "sales-by-product",     category: "sales", name: "Sales by Product",       description: "Top-selling items with quantity and value." , favourite: true },
  { id: "sales-by-region",      category: "sales", name: "Sales by Region",        description: "State-wise sales performance." },
  { id: "sales-by-salesperson", category: "sales", name: "Sales by Salesperson",   description: "Salesperson performance & achievement." },
  { id: "daily-sales",          category: "sales", name: "Daily Sales",            description: "Day-wise revenue trend." },
  { id: "monthly-sales",        category: "sales", name: "Monthly Sales",          description: "Month-wise revenue for the year." },
  { id: "quarterly-sales",      category: "sales", name: "Quarterly Sales",        description: "Quarter-on-quarter comparison." },
  { id: "annual-sales",         category: "sales", name: "Annual Sales",           description: "Year-on-year revenue trend." },
  { id: "order-pipeline",       category: "sales", name: "Order Pipeline",         description: "Confirmed and open orders in the pipeline." },
  { id: "order-fulfillment",    category: "sales", name: "Order Fulfillment",      description: "Fulfillment SLA and delivery performance." },
  { id: "customer-profitability", category: "sales", name: "Customer Profitability", description: "Gross margin ranked customers." },

  // Finance
  { id: "trial-balance",        category: "finance", name: "Trial Balance",        description: "Debits & credits balanced across ledgers.", kind: "statement", favourite: true },
  { id: "balance-sheet",        category: "finance", name: "Balance Sheet",        description: "Assets, Liabilities and Equity as on date.", kind: "statement" },
  { id: "profit-loss",          category: "finance", name: "Profit & Loss",        description: "Income statement for the period.", kind: "statement", favourite: true },
  { id: "cash-flow",            category: "finance", name: "Cash Flow",            description: "Operating, Investing & Financing activities.", kind: "statement" },
  { id: "bank-book",            category: "finance", name: "Bank Book",            description: "Bank-wise inflow/outflow transactions." },
  { id: "general-ledger",       category: "finance", name: "General Ledger",       description: "Account-wise transaction ledger." },
  { id: "customer-ledger",      category: "finance", name: "Customer Ledger",      description: "Customer-wise transaction ledger." },
  { id: "vendor-ledger",        category: "finance", name: "Vendor Ledger",        description: "Vendor-wise transaction ledger." },
  { id: "receivables-ageing",   category: "finance", name: "Receivables Ageing",   description: "AR ageing buckets 0-30, 30-60, 60-90, 90+." },
  { id: "payables-ageing",      category: "finance", name: "Payables Ageing",      description: "AP ageing buckets 0-30, 30-60, 60-90, 90+." },
  { id: "expense-analysis",     category: "finance", name: "Expense Analysis",     description: "Expense heads with variance." },
  { id: "cost-centre",          category: "finance", name: "Cost Centre Reports",  description: "Departmental cost centre performance." },

  // Inventory
  { id: "stock-ledger",         category: "inventory", name: "Stock Ledger",       description: "Item-wise in/out ledger.", favourite: true },
  { id: "inventory-valuation",  category: "inventory", name: "Inventory Valuation", description: "Valuation by FIFO/Weighted Avg." },
  { id: "inventory-ageing",     category: "inventory", name: "Inventory Ageing",   description: "Age of stock in warehouses." },
  { id: "batch-tracking",       category: "inventory", name: "Batch Tracking",     description: "Batch-wise stock and expiry." },
  { id: "serial-tracking",      category: "inventory", name: "Serial Tracking",    description: "Serial-number movement history." },
  { id: "warehouse-stock",      category: "inventory", name: "Warehouse Wise Stock", description: "Stock spread across warehouses." },
  { id: "dead-stock",           category: "inventory", name: "Dead Stock",         description: "Items with zero movement > 180 days." },
  { id: "slow-moving",          category: "inventory", name: "Slow Moving Stock",  description: "Low turnover items." },
  { id: "fast-moving",          category: "inventory", name: "Fast Moving Items",  description: "High-turnover SKUs." },
  { id: "reorder-report",       category: "inventory", name: "Reorder Report",     description: "Items below reorder level." },

  // Purchase
  { id: "purchase-register",    category: "purchase", name: "Purchase Register",   description: "Invoice-wise purchases.", favourite: true },
  { id: "vendor-performance",   category: "purchase", name: "Vendor Performance",  description: "OTIF, quality and pricing scorecards." },
  { id: "purchase-analysis",    category: "purchase", name: "Purchase Analysis",   description: "Spend cube by category/vendor." },
  { id: "open-pos",             category: "purchase", name: "Open Purchase Orders", description: "POs awaiting GRN." },
  { id: "pending-grns",         category: "purchase", name: "Pending GRNs",        description: "GRNs awaiting quality/finance clearance." },
  { id: "vendor-ageing",        category: "purchase", name: "Vendor Ageing",       description: "AP ageing by vendor." },
  { id: "price-variance",       category: "purchase", name: "Price Variance",      description: "PO vs invoice price variance." },

  // CRM
  { id: "lead-conversion",      category: "crm", name: "Lead Conversion",      description: "Conversion ratios by source & owner.", favourite: true },
  { id: "sales-funnel",         category: "crm", name: "Sales Funnel",         description: "Opportunities across pipeline stages." },
  { id: "opportunity-analysis", category: "crm", name: "Opportunity Analysis", description: "Weighted pipeline value and forecast." },
  { id: "sales-activities",     category: "crm", name: "Sales Activities",     description: "Calls, meetings and demos by rep." },
  { id: "follow-ups",           category: "crm", name: "Follow-ups",           description: "Upcoming and overdue follow-ups." },
  { id: "customer-acquisition", category: "crm", name: "Customer Acquisition", description: "New customers acquired per month." },

  // GST
  { id: "gstr1",                category: "gst", name: "GSTR-1",           description: "Outward supplies return.", favourite: true },
  { id: "gstr3b",               category: "gst", name: "GSTR-3B",          description: "Monthly summary return." },
  { id: "tax-summary",          category: "gst", name: "Tax Summary",      description: "Consolidated GST liability and ITC." },
  { id: "hsn-summary",          category: "gst", name: "HSN Summary",      description: "HSN/SAC-wise turnover." },
  { id: "itc",                  category: "gst", name: "Input Tax Credit", description: "Eligible and reversed ITC." },
  { id: "output-tax",           category: "gst", name: "Output Tax",       description: "Output GST across taxable supplies." },
  { id: "einvoice-summary",     category: "gst", name: "E-Invoice Summary", description: "IRN generated / cancelled." },
  { id: "eway-summary",         category: "gst", name: "E-Way Bill Summary", description: "EWB issued / cancelled / expired." },

  // Management
  { id: "ceo-dashboard",        category: "management", name: "CEO Dashboard",        description: "Company-wide KPI snapshot.", kind: "chart", favourite: true },
  { id: "cfo-dashboard",        category: "management", name: "CFO Dashboard",        description: "Finance-centric KPIs and cash view.", kind: "chart" },
  { id: "sales-dashboard",      category: "management", name: "Sales Dashboard",      description: "Sales KPIs and trends.", kind: "chart" },
  { id: "inventory-dashboard",  category: "management", name: "Inventory Dashboard",  description: "Stock KPIs and coverage.", kind: "chart" },
  { id: "procurement-dashboard", category: "management", name: "Procurement Dashboard", description: "Spend, vendor & PO KPIs.", kind: "chart" },
  { id: "operational-dashboard", category: "management", name: "Operational Dashboard", description: "Ops KPIs across the plant.", kind: "chart" },

  // Operational (curated cross-module)
  { id: "op-shipments-today",   category: "operational", name: "Shipments Today",     description: "Dispatches planned for today." },
  { id: "op-collections-today", category: "operational", name: "Collections Today",   description: "Payments expected today." },
  { id: "op-approvals-pending", category: "operational", name: "Approvals Pending",   description: "Documents awaiting approval." },
  { id: "op-quality-holds",     category: "operational", name: "Quality Holds",       description: "GRNs on quality hold." },
  { id: "op-machine-utilization", category: "operational", name: "Machine Utilization", description: "Live plant utilization." },
];

export const SAVED_REPORTS = [
  { id: "sv-1", name: "Weekly Sales Snapshot",  category: "sales",     schedule: "Every Mon 09:00", owner: "Priya S.",  format: "PDF", recipients: 4 },
  { id: "sv-2", name: "Ageing > 60 Days",       category: "finance",   schedule: "Every 1st",       owner: "Rakesh N.", format: "Excel", recipients: 3 },
  { id: "sv-3", name: "Reorder Alert",          category: "inventory", schedule: "Daily 07:00",     owner: "System",    format: "Email", recipients: 6 },
  { id: "sv-4", name: "GSTR-3B Draft",          category: "gst",       schedule: "Every 15th",      owner: "Sanya K.",  format: "PDF", recipients: 2 },
  { id: "sv-5", name: "Top 20 Customers",       category: "sales",     schedule: "Every quarter",   owner: "Priya S.",  format: "Excel", recipients: 5 },
  { id: "sv-6", name: "Vendor Scorecard Q-View", category: "purchase", schedule: "Quarterly",       owner: "Arjun R.",  format: "PDF", recipients: 3 },
];

// ---------- Dummy data generators (deterministic) ----------

function mulberry(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

const CUSTOMERS = ["Ashok Industries", "Bharat Steel", "Chola Motors", "Dhanraj Traders", "Eastern Cables", "Fortis Auto", "Gujarat Fasteners", "Himalayan Tools", "Indus Foundry", "Jai Ambe Metals"];
const VENDORS   = ["Sunrise Metals", "OmSai Traders", "Pioneer Alloys", "Reliable Bearings", "Shakti Coils", "Trident Chem", "Unity Rubber", "Vega Composites", "Weld-tech", "Xcel Alloys"];
const PRODUCTS  = ["Steel Rod 12mm", "MS Angle 40x40", "GI Sheet 1mm", "Copper Coil", "Bearing 6205", "Bolt M10", "Nut M10", "Rubber Gasket", "PVC Pipe 4in", "Cable 2.5sqmm"];
const REGIONS   = ["Maharashtra", "Gujarat", "Tamil Nadu", "Karnataka", "Delhi", "Uttar Pradesh", "West Bengal", "Telangana"];
const REPS      = ["Priya Sharma", "Rakesh Nair", "Sanya Kapoor", "Arjun Rao", "Meera Iyer", "Kunal Das"];
const MONTHS    = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const WAREHOUSES= ["Pune-WH1", "Mumbai-WH2", "Bengaluru-WH3", "Chennai-WH4"];
const ACCOUNTS  = ["Cash", "Bank - HDFC", "Accounts Receivable", "Accounts Payable", "Sales", "Purchases", "Salaries", "Rent", "Electricity", "GST Payable"];

export interface TableData {
  columns: { key: string; label: string; align?: "left" | "right"; format?: "number" | "currency" | "percent" | "date" | "text" }[];
  rows: Record<string, any>[];
  totals?: Record<string, any>;
}

export interface ChartSeries {
  key: string;
  label: string;
  data: { x: string; y: number }[];
}

export interface ReportData {
  table: TableData;
  chart: {
    type: "bar" | "line" | "area" | "pie";
    series: ChartSeries[];
    xLabel?: string;
    yLabel?: string;
  };
  pivot: {
    rows: string[];
    columns: string[];
    values: number[][];
    rowHeader: string;
    colHeader: string;
  };
  kpis: { label: string; value: string; delta?: string; tone?: "success" | "warn" | "danger" }[];
}

export function getReportData(reportId: string): ReportData {
  const rnd = mulberry(seedFromId(reportId));
  const r = REPORTS.find((x) => x.id === reportId);
  const category = r?.category ?? "sales";

  const pick = (arr: string[], n: number) => {
    const copy = [...arr];
    const out: string[] = [];
    for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
    return out;
  };
  const num = (min: number, max: number) => Math.floor(rnd() * (max - min) + min);

  // Default profile
  let entities: string[] = pick(CUSTOMERS, 8);
  let colKey = "customer";
  let colLabel = "Customer";
  let series = "revenue";
  let seriesLabel = "Revenue";
  let secondary: { key: string; label: string } | null = { key: "orders", label: "Orders" };
  let chartType: "bar" | "line" | "area" | "pie" = "bar";

  if (category === "purchase") { entities = pick(VENDORS, 8); colKey = "vendor"; colLabel = "Vendor"; series = "spend"; seriesLabel = "Spend"; secondary = { key: "pos", label: "POs" }; }
  else if (category === "inventory") { entities = pick(PRODUCTS, 8); colKey = "item"; colLabel = "Item"; series = "value"; seriesLabel = "Value"; secondary = { key: "qty", label: "Qty" }; }
  else if (category === "finance") { entities = pick(ACCOUNTS, 8); colKey = "account"; colLabel = "Account"; series = "amount"; seriesLabel = "Amount"; secondary = null; chartType = "line"; }
  else if (category === "crm") { entities = pick(REPS, 6); colKey = "rep"; colLabel = "Owner"; series = "leads"; seriesLabel = "Leads"; secondary = { key: "converted", label: "Converted" }; }
  else if (category === "gst") { entities = MONTHS.slice(0, 6); colKey = "period"; colLabel = "Period"; series = "output"; seriesLabel = "Output GST"; secondary = { key: "itc", label: "ITC" }; chartType = "area"; }

  // ID-specific overrides
  if (reportId === "sales-by-region") { entities = pick(REGIONS, 6); colKey = "region"; colLabel = "Region"; chartType = "pie"; }
  if (reportId === "sales-by-salesperson") { entities = pick(REPS, 6); colKey = "rep"; colLabel = "Salesperson"; }
  if (reportId === "sales-by-product" || reportId === "fast-moving" || reportId === "slow-moving") { entities = pick(PRODUCTS, 8); colKey = "product"; colLabel = "Product"; }
  if (reportId === "monthly-sales" || reportId === "daily-sales" || reportId === "annual-sales" || reportId === "quarterly-sales") { entities = MONTHS.slice(0, reportId === "annual-sales" ? 5 : 12); colKey = "period"; colLabel = "Period"; chartType = "line"; }
  if (reportId === "warehouse-stock") { entities = WAREHOUSES; colKey = "warehouse"; colLabel = "Warehouse"; chartType = "pie"; }

  const columns: TableData["columns"] = [
    { key: colKey, label: colLabel },
    { key: series, label: seriesLabel, align: "right", format: "currency" },
  ];
  if (secondary) columns.push({ key: secondary.key, label: secondary.label, align: "right", format: "number" });
  columns.push({ key: "share", label: "% Share", align: "right", format: "percent" });

  const raw = entities.map((e) => {
    const value = num(80_000, 2_500_000);
    const sec = secondary ? num(5, 220) : 0;
    return { [colKey]: e, [series]: value, ...(secondary ? { [secondary.key]: sec } : {}), _v: value };
  });
  const total = raw.reduce((s, r) => s + r._v, 0);
  const rows = raw.map((r) => ({ ...r, share: total ? r._v / total : 0 }));
  const totals: Record<string, any> = { [colKey]: "Total", [series]: total, share: 1 };
  if (secondary) totals[secondary.key] = rows.reduce((s, r) => s + (r as any)[secondary!.key], 0);

  // Chart series
  const chartSeries: ChartSeries[] = [
    { key: series, label: seriesLabel, data: rows.map((r) => ({ x: String((r as any)[colKey]), y: (r as any)[series] })) },
  ];
  if (secondary && chartType !== "pie") {
    chartSeries.push({ key: secondary.key, label: secondary.label, data: rows.map((r) => ({ x: String((r as any)[colKey]), y: (r as any)[secondary!.key] * num(1000, 3000) })) });
  }

  // Pivot: entities × months
  const cols = MONTHS.slice(0, 6);
  const values = entities.slice(0, 6).map(() => cols.map(() => num(20_000, 400_000)));

  // KPIs
  const kpis = [
    { label: "Total", value: `₹${(total / 100000).toFixed(1)}L`, delta: "+12.4%", tone: "success" as const },
    { label: "Avg / " + colLabel, value: `₹${(total / Math.max(1, rows.length) / 1000).toFixed(1)}k`, delta: "+3.1%", tone: "success" as const },
    { label: "Records", value: String(rows.length), delta: "—" },
    { label: "Period", value: "FY 25-26 YTD" },
  ];

  return {
    table: { columns, rows, totals },
    chart: { type: chartType, series: chartSeries, xLabel: colLabel, yLabel: seriesLabel },
    pivot: { rows: entities.slice(0, 6), columns: cols, values, rowHeader: colLabel, colHeader: "Month" },
    kpis,
  };
}

// AI insight suggestions
export const AI_SUGGESTIONS = [
  "Why did sales drop this month?",
  "Which products are not moving?",
  "Predict next month's revenue.",
  "Top five profitable customers.",
  "Generate executive summary.",
  "Highlight anomalies in expenses.",
  "Compare Q1 vs Q2 sales.",
  "Suggest reorder actions for low stock.",
];

export const AI_CANNED_INSIGHTS = [
  {
    title: "Revenue softness in August",
    body: "August revenue is 8.2% below the 6-month average. The dip is concentrated in the Karnataka region and in the Bearings category. Consider a targeted incentive for the Bengaluru territory.",
    tone: "warn" as const,
  },
  {
    title: "Top 5 profitable customers",
    body: "Ashok Industries, Chola Motors, Fortis Auto, Indus Foundry and Bharat Steel contribute 62% of gross margin. Prioritise account-management coverage on these five.",
    tone: "success" as const,
  },
  {
    title: "Slow-moving stock alert",
    body: "12 SKUs have had zero movement for > 120 days worth ₹18.4L. Recommend liquidation pricing on 4 of them and BOM substitution review on 3.",
    tone: "warn" as const,
  },
  {
    title: "Predicted next-month revenue",
    body: "Baseline forecast for October is ₹1.42Cr (±6%) driven by confirmed pipeline and seasonality patterns from FY 24-25.",
    tone: "success" as const,
  },
  {
    title: "Working capital pressure",
    body: "Receivables > 60 days grew ₹9.1L m-o-m. Automate reminders for the top 8 overdue accounts to release ~₹5.4L within 15 days.",
    tone: "danger" as const,
  },
];

// Custom-builder catalogs
export const BUILDER_FIELDS = {
  dimensions: ["Customer", "Vendor", "Product", "Region", "Salesperson", "Branch", "Warehouse", "Month", "Quarter", "Year", "GST Rate", "HSN"],
  measures:   ["Revenue", "Cost", "Gross Margin", "Qty Sold", "Qty Received", "Invoices", "Orders", "Outstanding", "Tax", "Discount", "Stock Value"],
  filters:    ["Date Range", "Branch", "Company", "Status", "Region", "Customer Group", "Vendor Group", "Currency"],
};

export { Star };