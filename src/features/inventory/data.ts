// In-memory mock data for the Inventory module.

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const formatNum = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  d.setHours(9 + (n % 8), (n * 7) % 60, 0, 0);
  return d.toISOString();
};

export const STATUS_TONES: Record<string, string> = {
  active:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive:     "bg-slate-100 text-slate-600 border-slate-200",
  in_stock:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  low_stock:    "bg-amber-50 text-amber-800 border-amber-200",
  out_of_stock: "bg-rose-50 text-rose-700 border-rose-200",
  reserved:     "bg-blue-50 text-blue-700 border-blue-200",
  quarantine:   "bg-rose-50 text-rose-700 border-rose-200",
  draft:        "bg-slate-100 text-slate-700 border-slate-200",
  posted:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_transit:   "bg-amber-50 text-amber-800 border-amber-200",
  received:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  scheduled:    "bg-blue-50 text-blue-700 border-blue-200",
  completed:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  variance:     "bg-amber-50 text-amber-800 border-amber-200",
  ok:           "bg-emerald-50 text-emerald-700 border-emerald-200",
  expiring:     "bg-amber-50 text-amber-800 border-amber-200",
  expired:      "bg-rose-50 text-rose-700 border-rose-200",
  IN:           "bg-emerald-50 text-emerald-700 border-emerald-200",
  OUT:          "bg-rose-50 text-rose-700 border-rose-200",
  TRANSFER:     "bg-blue-50 text-blue-700 border-blue-200",
  ADJUST:       "bg-amber-50 text-amber-800 border-amber-200",
};

// -------- Items -------------------------------------------------------
export interface Item {
  id: string; code: string; name: string; category: string; hsn: string;
  uom: string; gst: number; rate: number; onHand: number; reorder: number;
  warehouse: string; batchTracked: boolean; serialTracked: boolean;
  status: "active" | "inactive"; barcode: string;
}

const CATEGORIES = ["Raw Material", "Consumable", "Bearing", "Fastener", "Electrical", "Lubricant", "Safety"];

export const ITEMS: Item[] = [
  { id: "IT-001", code: "RM-100", name: "MS Angle 50x50x5mm - 6m",           category: "Raw Material", hsn: "7216", uom: "NOS",  gst: 18, rate: 1180,  onHand: 240, reorder: 100, warehouse: "WH-Chennai-Main", batchTracked: true,  serialTracked: false, status: "active",   barcode: "8901234500011" },
  { id: "IT-002", code: "RM-101", name: "Hex Bolt M12 x 60 (Zinc)",          category: "Fastener",     hsn: "7318", uom: "BOX",  gst: 18, rate: 420,   onHand: 58,  reorder: 80,  warehouse: "WH-Pune-Central", batchTracked: false, serialTracked: false, status: "active",   barcode: "8901234500028" },
  { id: "IT-003", code: "RM-102", name: "Copper Wire 2.5 sqmm (90m)",        category: "Electrical",   hsn: "8544", uom: "COIL", gst: 18, rate: 3050,  onHand: 32,  reorder: 25,  warehouse: "WH-Delhi-Depot",  batchTracked: true,  serialTracked: false, status: "active",   barcode: "8901234500035" },
  { id: "IT-004", code: "RM-103", name: "Ball Bearing 6205 ZZ",              category: "Bearing",      hsn: "8482", uom: "NOS",  gst: 18, rate: 580,   onHand: 420, reorder: 150, warehouse: "WH-Pune-Central", batchTracked: false, serialTracked: true,  status: "active",   barcode: "8901234500042" },
  { id: "IT-005", code: "RM-104", name: "Hydraulic Oil ISO 68 (210L)",       category: "Lubricant",    hsn: "2710", uom: "DRUM", gst: 18, rate: 17800, onHand: 4,   reorder: 8,   warehouse: "WH-Mumbai-Port",  batchTracked: true,  serialTracked: false, status: "active",   barcode: "8901234500059" },
  { id: "IT-006", code: "RM-105", name: "SS 304 Sheet 2mm (1.25 x 2.5m)",    category: "Raw Material", hsn: "7219", uom: "SHT",  gst: 18, rate: 8600,  onHand: 18,  reorder: 20,  warehouse: "WH-Chennai-Main", batchTracked: true,  serialTracked: false, status: "active",   barcode: "8901234500066" },
  { id: "IT-007", code: "RM-106", name: "PVC Conduit 25mm x 3m",             category: "Electrical",   hsn: "3917", uom: "NOS",  gst: 18, rate: 195,   onHand: 620, reorder: 200, warehouse: "WH-Delhi-Depot",  batchTracked: false, serialTracked: false, status: "active",   barcode: "8901234500073" },
  { id: "IT-008", code: "RM-107", name: "Safety Helmet - ISI (Yellow)",      category: "Safety",       hsn: "6506", uom: "NOS",  gst: 12, rate: 340,   onHand: 0,   reorder: 50,  warehouse: "WH-Pune-Central", batchTracked: false, serialTracked: false, status: "active",   barcode: "8901234500080" },
  { id: "IT-009", code: "RM-108", name: "Welding Rod E6013 (5kg)",           category: "Consumable",   hsn: "8311", uom: "BOX",  gst: 18, rate: 780,   onHand: 76,  reorder: 40,  warehouse: "WH-Chennai-Main", batchTracked: true,  serialTracked: false, status: "active",   barcode: "8901234500097" },
  { id: "IT-010", code: "RM-109", name: "Cutting Disc 4in (Pack of 25)",     category: "Consumable",   hsn: "6804", uom: "PKT",  gst: 18, rate: 1250,  onHand: 12,  reorder: 30,  warehouse: "WH-Mumbai-Port",  batchTracked: false, serialTracked: false, status: "active",   barcode: "8901234500103" },
  { id: "IT-011", code: "SP-201", name: "Servo Motor 1.5kW",                 category: "Electrical",   hsn: "8501", uom: "NOS",  gst: 18, rate: 42000, onHand: 3,   reorder: 5,   warehouse: "WH-Pune-Central", batchTracked: false, serialTracked: true,  status: "active",   barcode: "8901234500110" },
  { id: "IT-012", code: "SP-202", name: "Proximity Sensor NPN",              category: "Electrical",   hsn: "8536", uom: "NOS",  gst: 18, rate: 1450,  onHand: 26,  reorder: 20,  warehouse: "WH-Delhi-Depot",  batchTracked: false, serialTracked: true,  status: "inactive", barcode: "8901234500127" },
];

export const itemStockStatus = (i: Item): "in_stock" | "low_stock" | "out_of_stock" =>
  i.onHand === 0 ? "out_of_stock" : i.onHand < i.reorder ? "low_stock" : "in_stock";

// -------- Warehouses --------------------------------------------------
export interface Warehouse {
  id: string; code: string; name: string; city: string; state: string;
  manager: string; capacity: number; utilization: number; bins: number;
  status: "active" | "inactive";
}

export const WAREHOUSES: Warehouse[] = [
  { id: "WH-01", code: "WH-CHN", name: "WH-Chennai-Main",   city: "Chennai",   state: "TN", manager: "Anil Kumar",   capacity: 12000, utilization: 74, bins: 48, status: "active" },
  { id: "WH-02", code: "WH-PUN", name: "WH-Pune-Central",   city: "Pune",      state: "MH", manager: "Meera Iyer",   capacity: 9000,  utilization: 61, bins: 36, status: "active" },
  { id: "WH-03", code: "WH-MUM", name: "WH-Mumbai-Port",    city: "Mumbai",    state: "MH", manager: "Kiran Rao",    capacity: 15000, utilization: 88, bins: 72, status: "active" },
  { id: "WH-04", code: "WH-DEL", name: "WH-Delhi-Depot",    city: "New Delhi", state: "DL", manager: "Sanjay Gupta", capacity: 7500,  utilization: 42, bins: 30, status: "active" },
  { id: "WH-05", code: "WH-BLR", name: "WH-Bengaluru-Hub",  city: "Bengaluru", state: "KA", manager: "Nisha Pillai", capacity: 6000,  utilization: 55, bins: 24, status: "active" },
  { id: "WH-06", code: "WH-AHM", name: "WH-Ahmedabad-New",  city: "Ahmedabad", state: "GJ", manager: "Rajesh Menon", capacity: 5000,  utilization: 18, bins: 20, status: "inactive" },
];

// -------- Bins --------------------------------------------------------
export interface Bin {
  id: string; code: string; warehouse: string; zone: string; rack: string;
  shelf: string; capacity: number; used: number; items: number;
  status: "active" | "inactive";
}

export const BINS: Bin[] = Array.from({ length: 14 }).map((_, i) => {
  const wh = WAREHOUSES[i % WAREHOUSES.length];
  const zone = ["A", "B", "C", "D"][i % 4];
  const rack = String(1 + (i % 6)).padStart(2, "0");
  const shelf = String.fromCharCode(65 + (i % 5));
  const cap = 100 + (i % 4) * 50;
  return {
    id: `BIN-${String(i + 1).padStart(3, "0")}`,
    code: `${wh.code}-${zone}${rack}-${shelf}`,
    warehouse: wh.name,
    zone: `Zone ${zone}`, rack: `R${rack}`, shelf: `Shelf ${shelf}`,
    capacity: cap, used: Math.floor(cap * (0.3 + ((i * 7) % 60) / 100)),
    items: 1 + (i % 6),
    status: i === 11 ? "inactive" : "active",
  };
});

// -------- Stock Ledger / Movements -----------------------------------
export type MoveType = "IN" | "OUT" | "TRANSFER" | "ADJUST";
export interface LedgerEntry {
  id: string; date: string; docNo: string; docType: string;
  itemCode: string; itemName: string; warehouse: string;
  moveType: MoveType; qty: number; balance: number; rate: number;
  value: number; ref?: string; user: string;
}

const LEDGER_DOCS: { type: MoveType; doc: string; prefix: string }[] = [
  { type: "IN",       doc: "GRN",            prefix: "GRN" },
  { type: "OUT",      doc: "Delivery",       prefix: "DN" },
  { type: "TRANSFER", doc: "Stock Transfer", prefix: "ST" },
  { type: "ADJUST",   doc: "Adjustment",     prefix: "ADJ" },
  { type: "IN",       doc: "Opening",        prefix: "OPN" },
  { type: "OUT",      doc: "Consumption",    prefix: "MC" },
];

export const LEDGER: LedgerEntry[] = Array.from({ length: 22 }).map((_, i) => {
  const it = ITEMS[i % ITEMS.length];
  const d = LEDGER_DOCS[i % LEDGER_DOCS.length];
  const qty = 5 + (i % 9) * 3;
  const signed = d.type === "OUT" ? -qty : d.type === "ADJUST" ? (i % 2 === 0 ? -2 : 2) : qty;
  const balance = it.onHand + signed * (i % 3);
  return {
    id: `LED-${String(i + 1).padStart(4, "0")}`,
    date: daysAgo(i), docNo: `${d.prefix}-${1000 + i}`, docType: d.doc,
    itemCode: it.code, itemName: it.name, warehouse: it.warehouse,
    moveType: d.type, qty: signed, balance, rate: it.rate,
    value: Math.abs(signed) * it.rate,
    ref: d.type === "IN" ? `PO-${900 + i}` : d.type === "OUT" ? `SO-${800 + i}` : undefined,
    user: ["Anil Kumar", "Meera Iyer", "Kiran Rao", "Sanjay Gupta"][i % 4],
  };
});

// -------- Stock Transfer ---------------------------------------------
export interface StockTransfer {
  id: string; number: string; date: string;
  fromWh: string; toWh: string; lines: number;
  qty: number; status: "draft" | "in_transit" | "received" | "posted";
  requestedBy: string; approver: string;
}

export const TRANSFERS: StockTransfer[] = [
  { id: "ST-1", number: "ST-1001", date: daysAgo(1),  fromWh: "WH-Chennai-Main", toWh: "WH-Pune-Central",  lines: 3, qty: 120, status: "in_transit", requestedBy: "Meera Iyer",   approver: "Rajesh Menon" },
  { id: "ST-2", number: "ST-1002", date: daysAgo(4),  fromWh: "WH-Mumbai-Port",  toWh: "WH-Delhi-Depot",   lines: 5, qty: 340, status: "received",   requestedBy: "Kiran Rao",    approver: "Rajesh Menon" },
  { id: "ST-3", number: "ST-1003", date: daysAgo(6),  fromWh: "WH-Pune-Central", toWh: "WH-Bengaluru-Hub", lines: 2, qty: 40,  status: "posted",     requestedBy: "Nisha Pillai", approver: "Rajesh Menon" },
  { id: "ST-4", number: "ST-1004", date: daysAgo(2),  fromWh: "WH-Delhi-Depot",  toWh: "WH-Chennai-Main",  lines: 4, qty: 210, status: "draft",      requestedBy: "Sanjay Gupta", approver: "-" },
  { id: "ST-5", number: "ST-1005", date: daysAgo(9),  fromWh: "WH-Chennai-Main", toWh: "WH-Mumbai-Port",   lines: 6, qty: 480, status: "posted",     requestedBy: "Anil Kumar",   approver: "Rajesh Menon" },
  { id: "ST-6", number: "ST-1006", date: daysAgo(12), fromWh: "WH-Bengaluru-Hub",toWh: "WH-Pune-Central",  lines: 1, qty: 25,  status: "in_transit", requestedBy: "Nisha Pillai", approver: "Rajesh Menon" },
];

// -------- Stock Adjustment -------------------------------------------
export interface StockAdjustment {
  id: string; number: string; date: string; warehouse: string;
  itemCode: string; itemName: string; systemQty: number; physicalQty: number;
  variance: number; reason: string; status: "draft" | "posted"; postedBy: string;
}

const REASONS = ["Damage", "Cycle Count Variance", "Shrinkage", "Wrong Receipt", "System Error", "Sample Issue"];

export const ADJUSTMENTS: StockAdjustment[] = Array.from({ length: 8 }).map((_, i) => {
  const it = ITEMS[i % ITEMS.length];
  const sys = it.onHand + 10;
  const phy = sys + (i % 2 === 0 ? -3 : 2);
  return {
    id: `ADJ-${i + 1}`, number: `ADJ-${2000 + i}`, date: daysAgo(i + 1),
    warehouse: it.warehouse, itemCode: it.code, itemName: it.name,
    systemQty: sys, physicalQty: phy, variance: phy - sys,
    reason: REASONS[i % REASONS.length], status: i % 3 === 0 ? "draft" : "posted",
    postedBy: ["Anil Kumar", "Meera Iyer", "Kiran Rao"][i % 3],
  };
});

// -------- Opening Stock ----------------------------------------------
export interface OpeningStock {
  id: string; itemCode: string; itemName: string; warehouse: string;
  qty: number; rate: number; value: number; fy: string; postedBy: string; postedOn: string;
}

export const OPENING_STOCK: OpeningStock[] = ITEMS.slice(0, 10).map((it, i) => ({
  id: `OPN-${i + 1}`, itemCode: it.code, itemName: it.name, warehouse: it.warehouse,
  qty: it.onHand + 15, rate: it.rate, value: (it.onHand + 15) * it.rate,
  fy: "FY 2025-26", postedBy: "Rajesh Menon", postedOn: daysAgo(120 + i),
}));

// -------- Cycle Count -------------------------------------------------
export interface CycleCount {
  id: string; number: string; warehouse: string; zone: string;
  scheduled: string; completed?: string; items: number; counted: number;
  variance: number; assignedTo: string;
  status: "scheduled" | "in_transit" | "completed" | "variance";
}

export const CYCLE_COUNTS: CycleCount[] = [
  { id: "CC-1", number: "CC-501", warehouse: "WH-Chennai-Main",  zone: "Zone A", scheduled: daysAgo(-2), items: 48, counted: 0,  variance: 0,  assignedTo: "Anil Kumar",   status: "scheduled" },
  { id: "CC-2", number: "CC-502", warehouse: "WH-Pune-Central",  zone: "Zone B", scheduled: daysAgo(1),  completed: daysAgo(0), items: 36, counted: 36, variance: 4, assignedTo: "Meera Iyer",   status: "variance" },
  { id: "CC-3", number: "CC-503", warehouse: "WH-Mumbai-Port",   zone: "Zone C", scheduled: daysAgo(5),  completed: daysAgo(4), items: 72, counted: 72, variance: 0, assignedTo: "Kiran Rao",    status: "completed" },
  { id: "CC-4", number: "CC-504", warehouse: "WH-Delhi-Depot",   zone: "Zone A", scheduled: daysAgo(-5), items: 30, counted: 0,  variance: 0, assignedTo: "Sanjay Gupta", status: "scheduled" },
  { id: "CC-5", number: "CC-505", warehouse: "WH-Bengaluru-Hub", zone: "Zone D", scheduled: daysAgo(8),  completed: daysAgo(7), items: 24, counted: 24, variance: 1, assignedTo: "Nisha Pillai", status: "variance" },
  { id: "CC-6", number: "CC-506", warehouse: "WH-Pune-Central",  zone: "Zone C", scheduled: daysAgo(15), completed: daysAgo(14),items: 36, counted: 36, variance: 0, assignedTo: "Meera Iyer",   status: "completed" },
];

// -------- Batches -----------------------------------------------------
export interface BatchNo {
  id: string; batchNo: string; itemCode: string; itemName: string;
  warehouse: string; mfgDate: string; expiryDate: string;
  qty: number; status: "ok" | "expiring" | "expired" | "quarantine";
}

export const BATCHES: BatchNo[] = [
  { id: "B-1", batchNo: "B-2025-A011", itemCode: "RM-100", itemName: "MS Angle 50x50x5mm - 6m",    warehouse: "WH-Chennai-Main", mfgDate: daysAgo(90),  expiryDate: daysAgo(-540), qty: 120, status: "ok" },
  { id: "B-2", batchNo: "B-2025-A012", itemCode: "RM-102", itemName: "Copper Wire 2.5 sqmm (90m)", warehouse: "WH-Delhi-Depot",  mfgDate: daysAgo(60),  expiryDate: daysAgo(-30),  qty: 18,  status: "expiring" },
  { id: "B-3", batchNo: "B-2024-B004", itemCode: "RM-104", itemName: "Hydraulic Oil ISO 68 (210L)",warehouse: "WH-Mumbai-Port",  mfgDate: daysAgo(400), expiryDate: daysAgo(20),   qty: 4,   status: "expired" },
  { id: "B-4", batchNo: "B-2025-C007", itemCode: "RM-105", itemName: "SS 304 Sheet 2mm",           warehouse: "WH-Chennai-Main", mfgDate: daysAgo(45),  expiryDate: daysAgo(-720), qty: 18,  status: "ok" },
  { id: "B-5", batchNo: "B-2025-D010", itemCode: "RM-108", itemName: "Welding Rod E6013 (5kg)",    warehouse: "WH-Chennai-Main", mfgDate: daysAgo(70),  expiryDate: daysAgo(-60),  qty: 12,  status: "expiring" },
  { id: "B-6", batchNo: "B-2025-E015", itemCode: "RM-101", itemName: "Hex Bolt M12 x 60 (Zinc)",   warehouse: "WH-Pune-Central", mfgDate: daysAgo(20),  expiryDate: daysAgo(-900), qty: 58,  status: "ok" },
  { id: "B-7", batchNo: "B-2025-F022", itemCode: "RM-106", itemName: "SS 304 Sheet 2mm",           warehouse: "WH-Chennai-Main", mfgDate: daysAgo(30),  expiryDate: daysAgo(-720), qty: 6,   status: "quarantine" },
];

// -------- Serial Numbers ---------------------------------------------
export interface SerialNo {
  id: string; serialNo: string; itemCode: string; itemName: string;
  warehouse: string; receivedOn: string; warrantyEnd: string;
  status: "in_stock" | "reserved" | "OUT" | "quarantine";
  customer?: string;
}

export const SERIALS: SerialNo[] = [
  { id: "S-1", serialNo: "SN-BR-000121", itemCode: "RM-103", itemName: "Ball Bearing 6205 ZZ", warehouse: "WH-Pune-Central", receivedOn: daysAgo(30), warrantyEnd: daysAgo(-330), status: "in_stock" },
  { id: "S-2", serialNo: "SN-BR-000122", itemCode: "RM-103", itemName: "Ball Bearing 6205 ZZ", warehouse: "WH-Pune-Central", receivedOn: daysAgo(30), warrantyEnd: daysAgo(-330), status: "reserved", customer: "Mahindra Auto" },
  { id: "S-3", serialNo: "SN-SM-000045", itemCode: "SP-201", itemName: "Servo Motor 1.5kW",    warehouse: "WH-Pune-Central", receivedOn: daysAgo(60), warrantyEnd: daysAgo(-670), status: "OUT",      customer: "TVS Motors" },
  { id: "S-4", serialNo: "SN-SM-000046", itemCode: "SP-201", itemName: "Servo Motor 1.5kW",    warehouse: "WH-Pune-Central", receivedOn: daysAgo(60), warrantyEnd: daysAgo(-670), status: "in_stock" },
  { id: "S-5", serialNo: "SN-PX-000011", itemCode: "SP-202", itemName: "Proximity Sensor NPN", warehouse: "WH-Delhi-Depot",  receivedOn: daysAgo(90), warrantyEnd: daysAgo(-275), status: "quarantine" },
  { id: "S-6", serialNo: "SN-PX-000012", itemCode: "SP-202", itemName: "Proximity Sensor NPN", warehouse: "WH-Delhi-Depot",  receivedOn: daysAgo(90), warrantyEnd: daysAgo(-275), status: "in_stock" },
  { id: "S-7", serialNo: "SN-BR-000123", itemCode: "RM-103", itemName: "Ball Bearing 6205 ZZ", warehouse: "WH-Pune-Central", receivedOn: daysAgo(10), warrantyEnd: daysAgo(-350), status: "in_stock" },
];

// -------- Barcodes ----------------------------------------------------
export interface BarcodeRow {
  id: string; itemCode: string; itemName: string; barcode: string;
  format: "EAN-13" | "Code128" | "QR"; printed: number; lastPrinted: string;
}

export const BARCODES: BarcodeRow[] = ITEMS.map((it, i) => ({
  id: `BC-${i + 1}`, itemCode: it.code, itemName: it.name, barcode: it.barcode,
  format: (i % 3 === 0 ? "QR" : i % 3 === 1 ? "Code128" : "EAN-13") as BarcodeRow["format"],
  printed: 20 + (i * 13) % 250, lastPrinted: daysAgo(i + 1),
}));

// -------- Aging & Valuation ------------------------------------------
export interface AgingRow {
  id: string; itemCode: string; itemName: string; warehouse: string;
  d0_30: number; d31_60: number; d61_90: number; d91_180: number; d180plus: number;
  total: number; value: number;
}

export const AGING: AgingRow[] = ITEMS.map((it, i) => {
  const d0 = Math.floor(it.onHand * 0.35);
  const d1 = Math.floor(it.onHand * 0.25);
  const d2 = Math.floor(it.onHand * 0.18);
  const d3 = Math.floor(it.onHand * 0.12);
  const d4 = it.onHand - d0 - d1 - d2 - d3;
  return {
    id: `AG-${i + 1}`, itemCode: it.code, itemName: it.name, warehouse: it.warehouse,
    d0_30: d0, d31_60: d1, d61_90: d2, d91_180: d3, d180plus: Math.max(0, d4),
    total: it.onHand, value: it.onHand * it.rate,
  };
});

export interface ValuationRow {
  id: string; itemCode: string; itemName: string; category: string;
  qty: number; avgRate: number; value: number; method: "FIFO" | "Weighted Avg";
  warehouse: string;
}

export const VALUATION: ValuationRow[] = ITEMS.map((it, i) => ({
  id: `VAL-${i + 1}`, itemCode: it.code, itemName: it.name, category: it.category,
  qty: it.onHand, avgRate: it.rate, value: it.onHand * it.rate,
  method: i % 2 === 0 ? "FIFO" : "Weighted Avg", warehouse: it.warehouse,
}));

// -------- Dashboard KPIs ---------------------------------------------
export const DASHBOARD = {
  totalItems: ITEMS.length,
  totalWarehouses: WAREHOUSES.filter((w) => w.status === "active").length,
  stockValue: VALUATION.reduce((s, v) => s + v.value, 0),
  lowStock: ITEMS.filter((i) => itemStockStatus(i) === "low_stock").length,
  outOfStock: ITEMS.filter((i) => itemStockStatus(i) === "out_of_stock").length,
  expiringBatches: BATCHES.filter((b) => b.status === "expiring").length,
  expiredBatches: BATCHES.filter((b) => b.status === "expired").length,
  pendingTransfers: TRANSFERS.filter((t) => t.status !== "posted").length,
  cycleCountsDue: CYCLE_COUNTS.filter((c) => c.status === "scheduled").length,
};

export const CATEGORIES_LIST = CATEGORIES;
