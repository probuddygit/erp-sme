/**
 * GST API adapter — placeholder implementation.
 *
 * All e-invoice / e-way-bill / GSTR filing calls go through this module so we
 * can swap the mock adapter for a real NIC (GSP/ASP) integration later without
 * touching UI code. Each function mimics the shape of the real endpoint but
 * returns deterministic mock data after a short delay.
 */

export type GstProvider = "mock" | "nic";

export interface GstApiConfig {
  provider: GstProvider;
  gspBaseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  gstin?: string;
}

const DEFAULT_CONFIG: GstApiConfig = { provider: "mock" };

let activeConfig: GstApiConfig = DEFAULT_CONFIG;

export function configureGstApi(cfg: Partial<GstApiConfig>) {
  activeConfig = { ...activeConfig, ...cfg };
}

export function getGstApiConfig() {
  return activeConfig;
}

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

function rand(prefix: string) {
  return `${prefix}${Math.floor(Math.random() * 9e15).toString(36).toUpperCase()}`;
}

// -------- e-Invoice (IRN) --------
export interface EInvoiceRequest {
  invoiceNumber: string;
  invoiceDate: string;
  supplierGstin: string;
  buyerGstin: string;
  totalValue: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
}
export interface EInvoiceResponse {
  irn: string;
  ackNo: string;
  ackDate: string;
  qrCode: string;
  status: "generated" | "cancelled" | "failed";
}

export async function generateIrn(req: EInvoiceRequest): Promise<EInvoiceResponse> {
  await delay();
  return {
    irn: rand("IRN"),
    ackNo: rand(""),
    ackDate: new Date().toISOString(),
    qrCode: `data:qr;placeholder:${req.invoiceNumber}`,
    status: "generated",
  };
}

export async function cancelIrn(irn: string, reason: string): Promise<{ irn: string; status: "cancelled"; reason: string }> {
  await delay();
  return { irn, status: "cancelled", reason };
}

// -------- e-Way Bill --------
export interface EWayBillRequest {
  invoiceNumber: string;
  fromPin: string;
  toPin: string;
  distanceKm: number;
  vehicleNo: string;
  transporterId?: string;
  totalValue: number;
}
export interface EWayBillResponse {
  ewbNo: string;
  ewbDate: string;
  validUpto: string;
  status: "active" | "cancelled" | "expired";
}

export async function generateEwayBill(req: EWayBillRequest): Promise<EWayBillResponse> {
  await delay();
  const now = new Date();
  const validity = new Date(now.getTime() + Math.max(1, Math.ceil(req.distanceKm / 200)) * 86400000);
  return {
    ewbNo: rand("EWB"),
    ewbDate: now.toISOString(),
    validUpto: validity.toISOString(),
    status: "active",
  };
}

// -------- GSTR filing --------
export interface GstrFilingResult {
  arn: string;
  filedAt: string;
  status: "filed" | "submitted" | "rejected";
}

export async function fileGstr(kind: "GSTR1" | "GSTR3B", period: string): Promise<GstrFilingResult> {
  await delay(600);
  return {
    arn: rand("AA"),
    filedAt: new Date().toISOString(),
    status: "filed",
  };
}

export async function fetchGstin(gstin: string) {
  await delay();
  return {
    gstin,
    legalName: "Sample Enterprises Pvt Ltd",
    tradeName: "Sample Enterprises",
    state: "Karnataka",
    stateCode: "29",
    status: "Active" as const,
    registrationDate: "2018-04-01",
  };
}