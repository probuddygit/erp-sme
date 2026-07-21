// Dummy data + shared types for the CRM module.
// No backend integration — everything is in-memory and read-only.

export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type OpportunityStage = "prospecting" | "qualification" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
export type ActivityType = "call" | "meeting" | "email" | "task" | "note";
export type Priority = "low" | "medium" | "high";

export interface Attachment { id: string; name: string; size: string; uploadedAt: string; uploadedBy: string; }
export interface Note { id: string; author: string; createdAt: string; body: string; }

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  owner: string;
  value: number;
  status: LeadStatus;
  priority: Priority;
  createdAt: string;
  nextFollowUp?: string;
  notes: Note[];
  attachments: Attachment[];
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  account: string;
  email: string;
  phone: string;
  owner: string;
  lastContacted: string;
  tags: string[];
}

export interface Account {
  id: string;
  name: string;
  industry: string;
  website: string;
  city: string;
  employees: number;
  arr: number;
  owner: string;
  status: "active" | "prospect" | "churned";
}

export interface Opportunity {
  id: string;
  name: string;
  account: string;
  stage: OpportunityStage;
  value: number;
  probability: number;
  owner: string;
  closeDate: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  related: string;
  owner: string;
  when: string; // ISO date
  status: "planned" | "done" | "overdue";
}

export interface FollowUp {
  id: string;
  subject: string;
  lead: string;
  owner: string;
  dueDate: string;
  priority: Priority;
  done: boolean;
}

export interface EmailRecord {
  id: string;
  subject: string;
  from: string;
  to: string;
  sentAt: string;
  direction: "inbound" | "outbound";
  preview: string;
  opened: boolean;
}

export const LEAD_STATUSES: { key: LeadStatus; label: string; tone: string }[] = [
  { key: "new", label: "New", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "contacted", label: "Contacted", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "qualified", label: "Qualified", tone: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "proposal", label: "Proposal", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  { key: "won", label: "Won", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "lost", label: "Lost", tone: "bg-rose-50 text-rose-700 border-rose-200" },
];

export const OPP_STAGES: { key: OpportunityStage; label: string; tone: string }[] = [
  { key: "prospecting", label: "Prospecting", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "qualification", label: "Qualification", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "proposal", label: "Proposal", tone: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "negotiation", label: "Negotiation", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  { key: "closed_won", label: "Closed Won", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "closed_lost", label: "Closed Lost", tone: "bg-rose-50 text-rose-700 border-rose-200" },
];

const OWNERS = ["Aarav Shah", "Priya Menon", "Rohit Nair", "Sneha Iyer", "Vikram Rao"];
const SOURCES = ["Website", "Referral", "Trade Show", "Cold Call", "LinkedIn", "Partner"];

const sampleNotes = (n: number): Note[] =>
  Array.from({ length: n }).map((_, i) => ({
    id: `n-${i}-${Math.random().toString(36).slice(2, 8)}`,
    author: OWNERS[i % OWNERS.length],
    createdAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
    body: [
      "Left voicemail — will retry Tuesday.",
      "Sent product deck and pricing sheet.",
      "Decision maker on leave until next week.",
      "Strong interest, negotiating volume discount.",
    ][i % 4],
  }));

const sampleAttachments = (n: number): Attachment[] =>
  Array.from({ length: n }).map((_, i) => ({
    id: `a-${i}-${Math.random().toString(36).slice(2, 8)}`,
    name: ["proposal-v2.pdf", "spec-sheet.xlsx", "moU-draft.docx", "site-photos.zip"][i % 4],
    size: ["124 KB", "38 KB", "92 KB", "3.4 MB"][i % 4],
    uploadedAt: new Date(Date.now() - i * 86400000).toISOString(),
    uploadedBy: OWNERS[i % OWNERS.length],
  }));

const LEAD_ROWS: Omit<Lead, "notes" | "attachments">[] = [
  { id: "L-1001", name: "Ananya Kapoor", company: "Kapoor Fabricators",  email: "ananya@kapoorfab.in",    phone: "+91 98200 11223", source: "Website",   owner: "Aarav Shah",  value: 480000, status: "new",       priority: "high",   createdAt: "2026-07-14", nextFollowUp: "2026-07-22" },
  { id: "L-1002", name: "Rahul Deshmukh", company: "Deshmukh Auto Parts",email: "rahul@dap.co.in",       phone: "+91 98204 55890", source: "Referral",  owner: "Priya Menon", value: 260000, status: "contacted", priority: "medium", createdAt: "2026-07-10", nextFollowUp: "2026-07-23" },
  { id: "L-1003", name: "Meera Sundaram", company: "Sundaram Textiles",  email: "meera@sundtex.com",     phone: "+91 90045 12009", source: "Trade Show",owner: "Rohit Nair",  value: 920000, status: "qualified", priority: "high",   createdAt: "2026-07-08", nextFollowUp: "2026-07-24" },
  { id: "L-1004", name: "Arjun Bhatt",    company: "Bhatt Engineering",  email: "arjun@bhatteng.in",     phone: "+91 90013 99881", source: "Cold Call", owner: "Sneha Iyer",  value: 155000, status: "contacted", priority: "low",    createdAt: "2026-07-05", nextFollowUp: "2026-07-21" },
  { id: "L-1005", name: "Nikita Rao",     company: "Rao Precision",      email: "nikita@raopre.com",     phone: "+91 91234 00087", source: "LinkedIn",  owner: "Vikram Rao",  value: 1240000,status: "proposal",  priority: "high",   createdAt: "2026-06-28", nextFollowUp: "2026-07-25" },
  { id: "L-1006", name: "Karan Malhotra", company: "KM Steel Works",     email: "karan@kmsteel.in",      phone: "+91 90212 88761", source: "Partner",   owner: "Aarav Shah",  value: 640000, status: "qualified", priority: "medium", createdAt: "2026-07-01", nextFollowUp: "2026-07-26" },
  { id: "L-1007", name: "Divya Pillai",   company: "Pillai Polymers",    email: "divya@pillaipoly.com",  phone: "+91 98330 44012", source: "Website",   owner: "Priya Menon", value: 320000, status: "new",       priority: "medium", createdAt: "2026-07-16", nextFollowUp: "2026-07-27" },
  { id: "L-1008", name: "Sanjay Iyer",    company: "Iyer Chemicals",     email: "sanjay@iyerchem.com",   phone: "+91 90876 33211", source: "Referral",  owner: "Rohit Nair",  value: 780000, status: "won",       priority: "high",   createdAt: "2026-06-20" },
  { id: "L-1009", name: "Farah Sheikh",   company: "Sheikh Trading Co",  email: "farah@sheikhtrade.in",  phone: "+91 98123 77712", source: "Trade Show",owner: "Sneha Iyer",  value: 210000, status: "lost",      priority: "low",    createdAt: "2026-06-15" },
  { id: "L-1010", name: "Vishal Menon",   company: "Menon Foods",        email: "vishal@menonfoods.in",  phone: "+91 90011 22334", source: "Cold Call", owner: "Vikram Rao",  value: 415000, status: "contacted", priority: "medium", createdAt: "2026-07-12", nextFollowUp: "2026-07-28" },
  { id: "L-1011", name: "Preeti Sharma",  company: "Sharma Logistics",   email: "preeti@sharmalog.com",  phone: "+91 98800 90211", source: "LinkedIn",  owner: "Aarav Shah",  value: 570000, status: "proposal",  priority: "high",   createdAt: "2026-06-30", nextFollowUp: "2026-07-30" },
  { id: "L-1012", name: "Rohan Gupta",    company: "Gupta Hardware",     email: "rohan@guptahw.in",      phone: "+91 90922 44113", source: "Website",   owner: "Priya Menon", value: 189000, status: "new",       priority: "low",    createdAt: "2026-07-18", nextFollowUp: "2026-07-29" },
];

export const LEADS: Lead[] = LEAD_ROWS.map((l, i) => ({
  ...l,
  notes: sampleNotes((i % 3) + 1),
  attachments: sampleAttachments((i % 3) + 1),
}));

export const CONTACTS: Contact[] = [
  { id: "C-201", name: "Anita Rao",       title: "Procurement Head",  account: "Sundaram Textiles",  email: "anita.rao@sundtex.com",   phone: "+91 90045 12009", owner: "Rohit Nair",  lastContacted: "2026-07-16", tags: ["decision-maker"] },
  { id: "C-202", name: "Vikas Nair",      title: "CFO",               account: "Kapoor Fabricators", email: "vikas.n@kapoorfab.in",    phone: "+91 98200 11224", owner: "Aarav Shah",  lastContacted: "2026-07-14", tags: ["finance"] },
  { id: "C-203", name: "Sunita Bhatt",    title: "Plant Manager",     account: "Bhatt Engineering",  email: "sunita.b@bhatteng.in",    phone: "+91 90013 99882", owner: "Sneha Iyer",  lastContacted: "2026-07-10", tags: ["operations"] },
  { id: "C-204", name: "Mahesh Deshmukh", title: "Owner",             account: "Deshmukh Auto Parts",email: "mahesh@dap.co.in",       phone: "+91 98204 55891", owner: "Priya Menon", lastContacted: "2026-07-12", tags: ["decision-maker","vip"] },
  { id: "C-205", name: "Ravi Malhotra",   title: "Purchase Manager",  account: "KM Steel Works",     email: "ravi.m@kmsteel.in",       phone: "+91 90212 88762", owner: "Aarav Shah",  lastContacted: "2026-07-08", tags: [] },
  { id: "C-206", name: "Neha Pillai",     title: "COO",               account: "Pillai Polymers",    email: "neha.p@pillaipoly.com",   phone: "+91 98330 44013", owner: "Priya Menon", lastContacted: "2026-07-15", tags: ["decision-maker"] },
  { id: "C-207", name: "Suresh Iyer",     title: "Founder",           account: "Iyer Chemicals",     email: "suresh@iyerchem.com",     phone: "+91 90876 33212", owner: "Rohit Nair",  lastContacted: "2026-06-25", tags: ["vip"] },
  { id: "C-208", name: "Aditi Menon",     title: "Sales Lead",        account: "Menon Foods",        email: "aditi.m@menonfoods.in",   phone: "+91 90011 22335", owner: "Vikram Rao",  lastContacted: "2026-07-11", tags: [] },
];

export const ACCOUNTS: Account[] = [
  { id: "A-301", name: "Sundaram Textiles",   industry: "Textiles",     website: "sundtex.com",       city: "Coimbatore", employees: 320, arr: 8500000, owner: "Rohit Nair",  status: "active" },
  { id: "A-302", name: "Kapoor Fabricators",  industry: "Metal Fab",    website: "kapoorfab.in",      city: "Ludhiana",   employees: 145, arr: 4200000, owner: "Aarav Shah",  status: "prospect" },
  { id: "A-303", name: "Bhatt Engineering",   industry: "Engineering",  website: "bhatteng.in",       city: "Pune",       employees: 210, arr: 3100000, owner: "Sneha Iyer",  status: "active" },
  { id: "A-304", name: "Deshmukh Auto Parts", industry: "Automotive",   website: "dap.co.in",         city: "Nashik",     employees: 95,  arr: 2600000, owner: "Priya Menon", status: "prospect" },
  { id: "A-305", name: "KM Steel Works",      industry: "Steel",        website: "kmsteel.in",        city: "Raipur",     employees: 410, arr: 12400000,owner: "Aarav Shah",  status: "active" },
  { id: "A-306", name: "Pillai Polymers",     industry: "Polymers",     website: "pillaipoly.com",    city: "Kochi",      employees: 180, arr: 5900000, owner: "Priya Menon", status: "active" },
  { id: "A-307", name: "Iyer Chemicals",      industry: "Chemicals",    website: "iyerchem.com",      city: "Chennai",    employees: 260, arr: 7800000, owner: "Rohit Nair",  status: "active" },
  { id: "A-308", name: "Menon Foods",         industry: "Food & Bev",   website: "menonfoods.in",     city: "Bengaluru",  employees: 88,  arr: 1900000, owner: "Vikram Rao",  status: "prospect" },
  { id: "A-309", name: "Sheikh Trading Co",   industry: "Trading",      website: "sheikhtrade.in",    city: "Hyderabad",  employees: 40,  arr: 640000,  owner: "Sneha Iyer",  status: "churned" },
];

export const OPPORTUNITIES: Opportunity[] = [
  { id: "O-401", name: "Sundaram — Yarn ERP rollout",   account: "Sundaram Textiles",  stage: "negotiation",  value: 1850000, probability: 70, owner: "Rohit Nair",  closeDate: "2026-08-15" },
  { id: "O-402", name: "Kapoor — Fab shop MES pilot",   account: "Kapoor Fabricators", stage: "proposal",     value: 620000,  probability: 55, owner: "Aarav Shah",  closeDate: "2026-08-05" },
  { id: "O-403", name: "Bhatt — QC module expansion",   account: "Bhatt Engineering",  stage: "qualification",value: 240000,  probability: 35, owner: "Sneha Iyer",  closeDate: "2026-09-10" },
  { id: "O-404", name: "Deshmukh — Inventory revamp",   account: "Deshmukh Auto Parts",stage: "prospecting",  value: 410000,  probability: 20, owner: "Priya Menon", closeDate: "2026-09-25" },
  { id: "O-405", name: "KM Steel — Multi-plant edition",account: "KM Steel Works",     stage: "negotiation",  value: 2450000, probability: 75, owner: "Aarav Shah",  closeDate: "2026-08-20" },
  { id: "O-406", name: "Pillai — GST automation",       account: "Pillai Polymers",    stage: "proposal",     value: 380000,  probability: 60, owner: "Priya Menon", closeDate: "2026-08-11" },
  { id: "O-407", name: "Iyer — Batch traceability",     account: "Iyer Chemicals",     stage: "closed_won",   value: 890000,  probability: 100,owner: "Rohit Nair",  closeDate: "2026-07-01" },
  { id: "O-408", name: "Menon — POS integration",       account: "Menon Foods",        stage: "qualification",value: 180000,  probability: 30, owner: "Vikram Rao",  closeDate: "2026-09-05" },
  { id: "O-409", name: "Sheikh — Renewal (declined)",   account: "Sheikh Trading Co",  stage: "closed_lost",  value: 210000,  probability: 0,  owner: "Sneha Iyer",  closeDate: "2026-06-15" },
];

const today = new Date();
const iso = (offsetDays: number, h = 10) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

export const ACTIVITIES: Activity[] = [
  { id: "AC-501", type: "call",    subject: "Discovery call with Ananya",     related: "L-1001", owner: "Aarav Shah",  when: iso(1, 11),  status: "planned" },
  { id: "AC-502", type: "meeting", subject: "On-site walkthrough — Sundaram", related: "A-301",  owner: "Rohit Nair",  when: iso(2, 14),  status: "planned" },
  { id: "AC-503", type: "email",   subject: "Send proposal v2 to KM Steel",   related: "O-405",  owner: "Aarav Shah",  when: iso(0, 9),   status: "planned" },
  { id: "AC-504", type: "task",    subject: "Prepare BOM sample deck",        related: "O-402",  owner: "Aarav Shah",  when: iso(3, 15),  status: "planned" },
  { id: "AC-505", type: "call",    subject: "Follow up with Bhatt Eng.",      related: "L-1004", owner: "Sneha Iyer",  when: iso(-1, 10), status: "overdue" },
  { id: "AC-506", type: "meeting", subject: "Kickoff — Iyer Chemicals",       related: "O-407",  owner: "Rohit Nair",  when: iso(5, 16),  status: "planned" },
  { id: "AC-507", type: "email",   subject: "Contract terms — Pillai",        related: "O-406",  owner: "Priya Menon", when: iso(-2, 13), status: "done" },
  { id: "AC-508", type: "task",    subject: "Send NDA to Deshmukh",           related: "L-1002", owner: "Priya Menon", when: iso(1, 12),  status: "planned" },
  { id: "AC-509", type: "call",    subject: "Renewal chat — Menon Foods",     related: "A-308",  owner: "Vikram Rao",  when: iso(4, 11),  status: "planned" },
  { id: "AC-510", type: "note",    subject: "Competitor intel — Sheikh",      related: "A-309",  owner: "Sneha Iyer",  when: iso(-3, 17), status: "done" },
];

export const FOLLOW_UPS: FollowUp[] = [
  { id: "F-601", subject: "Retry demo scheduling",       lead: "L-1001", owner: "Aarav Shah",  dueDate: iso(1),  priority: "high",   done: false },
  { id: "F-602", subject: "Share pricing sheet",         lead: "L-1002", owner: "Priya Menon", dueDate: iso(2),  priority: "medium", done: false },
  { id: "F-603", subject: "Confirm on-site visit",       lead: "L-1003", owner: "Rohit Nair",  dueDate: iso(3),  priority: "high",   done: false },
  { id: "F-604", subject: "Send updated proposal",       lead: "L-1005", owner: "Vikram Rao",  dueDate: iso(4),  priority: "high",   done: false },
  { id: "F-605", subject: "Check budget approval",       lead: "L-1006", owner: "Aarav Shah",  dueDate: iso(-1), priority: "medium", done: false },
  { id: "F-606", subject: "Thank-you email",             lead: "L-1008", owner: "Rohit Nair",  dueDate: iso(-2), priority: "low",    done: true },
  { id: "F-607", subject: "Loop in finance",             lead: "L-1011", owner: "Aarav Shah",  dueDate: iso(5),  priority: "medium", done: false },
  { id: "F-608", subject: "Reintroduce Q4 offer",        lead: "L-1010", owner: "Vikram Rao",  dueDate: iso(6),  priority: "low",    done: false },
];

export const EMAILS: EmailRecord[] = [
  { id: "E-701", subject: "Re: ERP proposal for Kapoor Fabricators", from: "ananya@kapoorfab.in",   to: "aarav@forgeerp.io", sentAt: iso(-1, 9),  direction: "inbound",  preview: "Thanks for the deck. Could we get pricing for 25 users vs 40?", opened: true },
  { id: "E-702", subject: "Proposal v2 — Sundaram Textiles",         from: "rohit@forgeerp.io",    to: "meera@sundtex.com", sentAt: iso(-2, 15), direction: "outbound", preview: "Please find the revised proposal attached with the updated MES scope.", opened: true },
  { id: "E-703", subject: "Site visit confirmation",                 from: "sunita.b@bhatteng.in", to: "sneha@forgeerp.io", sentAt: iso(-2, 11), direction: "inbound",  preview: "We can host you on the 24th between 10am–1pm at our Pune plant.", opened: true },
  { id: "E-704", subject: "Contract redlines",                       from: "vikas.n@kapoorfab.in", to: "aarav@forgeerp.io", sentAt: iso(-3, 18), direction: "inbound",  preview: "Attaching the legal team's comments on sections 4 and 7.", opened: false },
  { id: "E-705", subject: "Discovery call notes",                    from: "priya@forgeerp.io",    to: "rahul@dap.co.in",   sentAt: iso(-4, 12), direction: "outbound", preview: "Summary of what we discussed and the next steps for the pilot.", opened: true },
  { id: "E-706", subject: "Re: Batch traceability rollout",          from: "suresh@iyerchem.com",  to: "rohit@forgeerp.io", sentAt: iso(-5, 10), direction: "inbound",  preview: "Kickoff on the 5th works for us. We'll share the plant SOPs beforehand.", opened: true },
  { id: "E-707", subject: "POS integration scope",                   from: "vikram@forgeerp.io",   to: "aditi.m@menonfoods.in", sentAt: iso(-6, 17), direction: "outbound", preview: "Scoping doc for the POS <> ERP sync, request your feedback by Friday.", opened: false },
  { id: "E-708", subject: "Re: Renewal terms",                       from: "farah@sheikhtrade.in", to: "sneha@forgeerp.io", sentAt: iso(-10, 14),direction: "inbound",  preview: "We've decided to pause the renewal for this quarter. Will revisit later.", opened: true },
];

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });