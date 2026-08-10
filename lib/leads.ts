import db from "./db";
import { randomUUID } from "crypto";

export type LeadStatus = "New" | "Contacted" | "Interested" | "Converted" | "Lost";

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  source: string | null;
  leadDate: string | null;
  status: LeadStatus;
  assignedToId: string | null;
  dealValue: number | null;
  priceQuoted: number | null;
  clientBudget: number | null;
  extraData: Record<string, string> | null;
  closedAt: number | null;
  createdAt: number;
  updatedAt: number;
  batchId: string | null;
}

export const EDITABLE_LEAD_FIELDS = [
  "name",
  "email",
  "phone",
  "company",
  "city",
  "source",
  "leadDate",
  "priceQuoted",
  "clientBudget",
] as const;
export type EditableLeadField = (typeof EDITABLE_LEAD_FIELDS)[number];

function parseExtraData(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export const COMMISSION_RATE = 0.2;

export interface Note {
  id: string;
  leadId: string;
  authorId: string;
  authorName?: string;
  content: string;
  createdAt: number;
}

export interface Tag {
  id: string;
  leadId: string;
  label: string;
  color: string;
  createdBy: string;
  createdAt: number;
}

export interface Activity {
  id: string;
  leadId: string;
  type: string;
  message: string;
  createdAt: number;
}

export async function createLead(data: Partial<Lead>): Promise<Lead> {
  const id = randomUUID();
  const now = Date.now();

  const extraDataJson = data.extraData ? JSON.stringify(data.extraData) : null;

  const stmt = db.prepare(`
    INSERT INTO leads (
      id, name, email, phone, company, city, source, leadDate, 
      status, assignedToId, batchId, priceQuoted, clientBudget, extraData, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.run(
    id,
    data.name || "",
    data.email || null,
    data.phone || null,
    data.company || null,
    data.city || null,
    data.source || null,
    data.leadDate || null,
    data.status || "New",
    data.assignedToId || null,
    data.batchId || null,
    data.priceQuoted ?? null,
    data.clientBudget ?? null,
    extraDataJson,
    now,
    now
  );

  return {
    id,
    name: data.name || "",
    email: data.email || null,
    phone: data.phone || null,
    company: data.company || null,
    city: data.city || null,
    source: data.source || null,
    leadDate: data.leadDate || null,
    status: (data.status || "New") as LeadStatus,
    assignedToId: data.assignedToId || null,
    batchId: data.batchId || null,
    dealValue: null,
    priceQuoted: data.priceQuoted ?? null,
    clientBudget: data.clientBudget ?? null,
    extraData: data.extraData || null,
    closedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateLeadFields(
  leadId: string,
  fields: Partial<Record<EditableLeadField, string | number | null>>
): Promise<boolean> {
  const entries = Object.entries(fields).filter(([key]) =>
    (EDITABLE_LEAD_FIELDS as readonly string[]).includes(key)
  );
  if (entries.length === 0) return false;

  const now = Date.now();
  const setClause = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => (value === undefined ? null : value));

  await db.prepare(`UPDATE leads SET ${setClause}, updatedAt = ? WHERE id = ?`).run(
    ...values,
    now,
    leadId
  );
  await logActivity(leadId, "FIELDS_UPDATED", `Updated ${entries.map(([k]) => k).join(", ")}`);
  return true;
}

export async function getLead(
  id: string
): Promise<(Lead & { tags: Tag[]; noteCount: number }) | null> {
  const stmt = db.prepare("SELECT * FROM leads WHERE id = ? LIMIT 1");
  const lead = (await stmt.get(id)) as Lead | undefined;

  if (!lead) return null;

  const tags = (await db
    .prepare("SELECT * FROM tags WHERE leadId = ? ORDER BY createdAt DESC")
    .all(id)) as Tag[];

  const noteCount = (
    (await db.prepare("SELECT COUNT(*) as count FROM notes WHERE leadId = ?").get(id)) as {
      count: number;
    }
  ).count;

  return { ...lead, extraData: parseExtraData((lead as any).extraData), tags, noteCount };
}

export async function getLeads(filters?: {
  status?: string;
  assignedToId?: string | null;
  search?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<(Lead & { tags: Tag[]; noteCount: number })[]> {
  let sql = `
    SELECT l.* FROM leads l
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.status) {
    sql += " AND l.status = ?";
    params.push(filters.status);
  }

  if (filters?.assignedToId) {
    sql += " AND l.assignedToId = ?";
    params.push(filters.assignedToId);
  }

  if (filters?.search) {
    sql += " AND (l.name LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.company LIKE ?)";
    const search = `%${filters.search}%`;
    params.push(search, search, search, search);
  }

  if (filters?.fromDate) {
    sql += " AND l.leadDate >= ?";
    params.push(filters.fromDate);
  }

  if (filters?.toDate) {
    sql += " AND l.leadDate <= ?";
    params.push(filters.toDate);
  }

  sql += " ORDER BY l.createdAt DESC";

  const leads = (await db.prepare(sql).all(...params)) as Lead[];

  return Promise.all(
    leads.map(async (lead) => {
      const tags = (await db
        .prepare("SELECT * FROM tags WHERE leadId = ? ORDER BY createdAt DESC")
        .all(lead.id)) as Tag[];

      const noteCount = (
        (await db
          .prepare("SELECT COUNT(*) as count FROM notes WHERE leadId = ?")
          .get(lead.id)) as {
          count: number;
        }
      ).count;

      return { ...lead, extraData: parseExtraData((lead as any).extraData), tags, noteCount };
    })
  );
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  dealValue?: number | null
): Promise<boolean> {
  const now = Date.now();

  if (status === "Converted") {
    const current = (await db.prepare("SELECT closedAt FROM leads WHERE id = ?").get(leadId)) as
      | { closedAt: number | null }
      | undefined;
    const closedAt = current?.closedAt || now;

    if (dealValue !== undefined) {
      await db
        .prepare(
          "UPDATE leads SET status = ?, dealValue = ?, closedAt = ?, updatedAt = ? WHERE id = ?"
        )
        .run(status, dealValue, closedAt, now, leadId);
    } else {
      await db
        .prepare("UPDATE leads SET status = ?, closedAt = ?, updatedAt = ? WHERE id = ?")
        .run(status, closedAt, now, leadId);
    }
  } else {
    await db
      .prepare("UPDATE leads SET status = ?, closedAt = NULL, updatedAt = ? WHERE id = ?")
      .run(status, now, leadId);
  }

  await logActivity(leadId, "STATUS_CHANGE", `Status changed to ${status}`);
  return true;
}

export async function setDealValue(leadId: string, dealValue: number): Promise<boolean> {
  const now = Date.now();
  const lead = (await db.prepare("SELECT status, closedAt FROM leads WHERE id = ?").get(leadId)) as
    | { status: LeadStatus; closedAt: number | null }
    | undefined;
  if (!lead) return false;

  const closedAt = lead.status === "Converted" ? lead.closedAt || now : lead.closedAt;

  await db
    .prepare("UPDATE leads SET dealValue = ?, closedAt = ?, updatedAt = ? WHERE id = ?")
    .run(dealValue, closedAt, now, leadId);
  await logActivity(leadId, "DEAL_VALUE_SET", `Deal value set to ${dealValue}`);
  return true;
}

export async function assignLead(leadId: string, userId: string | null): Promise<boolean> {
  const now = Date.now();
  const stmt = db.prepare("UPDATE leads SET assignedToId = ?, updatedAt = ? WHERE id = ?");
  await stmt.run(userId, now, leadId);

  if (userId) {
    await logActivity(leadId, "ASSIGNMENT", `Lead assigned to a sales rep`);
  }
  return true;
}

// libSQL has no synchronous db.transaction() callback like better-sqlite3, so
// this is rebuilt on client.batch(), which runs a list of statements in a
// single implicit transaction. Trade-off vs the old version: batch() doesn't
// give us per-row `changes` to decide *conditionally* whether to log
// activity, so the updates run in one batch, then a second batch writes
// activity rows only for leads that actually existed (rowsAffected > 0).
// Two round trips instead of one, but still atomic per phase and behaviorally
// equivalent for valid (existing) lead ids, which is the overwhelming case.
export async function bulkAssignLeads(leadIds: string[], userId: string | null): Promise<number> {
  if (leadIds.length === 0) return 0;

  const now = Date.now();

  const updateResults = await db.client.batch(
    leadIds.map((id) => ({
      sql: "UPDATE leads SET assignedToId = ?, updatedAt = ? WHERE id = ?",
      args: [userId, now, id],
    })),
    "write"
  );

  const updatedIds = leadIds.filter((_, i) => updateResults[i].rowsAffected > 0);

  if (userId && updatedIds.length > 0) {
    await db.client.batch(
      updatedIds.map((id) => ({
        sql: "INSERT INTO activity (id, leadId, type, message, createdAt) VALUES (?, ?, ?, ?, ?)",
        args: [randomUUID(), id, "ASSIGNMENT", "Lead assigned to a sales rep", now],
      })),
      "write"
    );
  }

  return updatedIds.length;
}

export async function getAllLeadIds(): Promise<string[]> {
  const rows = (await db.prepare("SELECT id FROM leads").all()) as { id: string }[];
  return rows.map((r) => r.id);
}

export async function addNote(leadId: string, authorId: string, content: string): Promise<Note> {
  const id = randomUUID();
  const now = Date.now();

  const stmt = db.prepare(
    "INSERT INTO notes (id, leadId, authorId, content, createdAt) VALUES (?, ?, ?, ?, ?)"
  );
  await stmt.run(id, leadId, authorId, content, now);

  await logActivity(leadId, "NOTE_ADDED", "Note added");

  return { id, leadId, authorId, content, createdAt: now };
}

export async function getNotes(leadId: string): Promise<Note[]> {
  const stmt = db.prepare(`
    SELECT n.*, u.name as authorName FROM notes n
    LEFT JOIN users u ON n.authorId = u.id
    WHERE n.leadId = ?
    ORDER BY n.createdAt DESC
  `);
  return (await stmt.all(leadId)) as Note[];
}

export async function getNoteById(noteId: string): Promise<Note | null> {
  const stmt = db.prepare("SELECT * FROM notes WHERE id = ? LIMIT 1");
  const note = (await stmt.get(noteId)) as Note | undefined;
  return note || null;
}

export async function updateNote(noteId: string, content: string): Promise<boolean> {
  const stmt = db.prepare("UPDATE notes SET content = ? WHERE id = ?");
  const result = await stmt.run(content, noteId);
  return result.changes > 0;
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const stmt = db.prepare("DELETE FROM notes WHERE id = ?");
  const result = await stmt.run(noteId);
  return result.changes > 0;
}

export async function addTag(
  leadId: string,
  label: string,
  color: string,
  createdBy: string
): Promise<Tag> {
  const id = randomUUID();
  const now = Date.now();

  const stmt = db.prepare(
    "INSERT INTO tags (id, leadId, label, color, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  );
  await stmt.run(id, leadId, label, color, createdBy, now);

  await logActivity(leadId, "TAG_ADDED", `Tag '${label}' added`);

  return { id, leadId, label, color, createdBy, createdAt: now };
}

export async function removeTag(tagId: string): Promise<boolean> {
  const tag = (await db.prepare("SELECT * FROM tags WHERE id = ?").get(tagId)) as Tag | undefined;
  if (!tag) return false;

  await db.prepare("DELETE FROM tags WHERE id = ?").run(tagId);
  await logActivity(tag.leadId, "TAG_REMOVED", `Tag '${tag.label}' removed`);
  return true;
}

export async function logActivity(leadId: string, type: string, message: string): Promise<void> {
  const id = randomUUID();
  const now = Date.now();

  const stmt = db.prepare(
    "INSERT INTO activity (id, leadId, type, message, createdAt) VALUES (?, ?, ?, ?, ?)"
  );
  await stmt.run(id, leadId, type, message, now);
}

export async function getActivity(leadId: string): Promise<Activity[]> {
  const stmt = db.prepare(
    "SELECT * FROM activity WHERE leadId = ? ORDER BY createdAt DESC LIMIT 50"
  );
  return (await stmt.all(leadId)) as Activity[];
}

export async function getLeadStats(): Promise<{
  total: number;
  byStatus: Record<LeadStatus, number>;
  assigned: number;
  unassigned: number;
}> {
  const total = (
    (await db.prepare("SELECT COUNT(*) as count FROM leads").get()) as { count: number }
  ).count;

  const byStatus = {} as Record<LeadStatus, number>;
  const statuses: LeadStatus[] = ["New", "Contacted", "Interested", "Converted", "Lost"];

  for (const status of statuses) {
    byStatus[status] = (
      (await db
        .prepare("SELECT COUNT(*) as count FROM leads WHERE status = ?")
        .get(status)) as { count: number }
    ).count;
  }

  const assigned = (
    (await db
      .prepare("SELECT COUNT(*) as count FROM leads WHERE assignedToId IS NOT NULL")
      .get()) as {
      count: number;
    }
  ).count;

  return {
    total,
    byStatus,
    assigned,
    unassigned: total - assigned,
  };
}

export async function deleteLead(leadId: string): Promise<boolean> {
  await db.client.batch(
    [
      { sql: "DELETE FROM notes WHERE leadId = ?", args: [leadId] },
      { sql: "DELETE FROM tags WHERE leadId = ?", args: [leadId] },
      { sql: "DELETE FROM activity WHERE leadId = ?", args: [leadId] },
      { sql: "DELETE FROM leads WHERE id = ?", args: [leadId] },
    ],
    "write"
  );
  return true;
}

export interface ClosedDeal {
  id: string;
  name: string;
  company: string | null;
  dealValue: number;
  commission: number;
  closedAt: number;
}

function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getClosedDeals(userId: string): Promise<ClosedDeal[]> {
  const rows = (await db
    .prepare(
      `SELECT id, name, company, dealValue, closedAt FROM leads
       WHERE assignedToId = ? AND status = 'Converted' AND dealValue IS NOT NULL AND closedAt IS NOT NULL
       ORDER BY closedAt DESC`
    )
    .all(userId)) as {
    id: string;
    name: string;
    company: string | null;
    dealValue: number;
    closedAt: number;
  }[];

  return rows.map((r) => ({
    ...r,
    commission: r.dealValue * COMMISSION_RATE,
  }));
}

export interface EarningsSummary {
  overallIncome: number;
  overallDealValue: number;
  currentMonthIncome: number;
  currentMonthDealValue: number;
  dealsClosedCount: number;
  currentMonthDealsCount: number;
  monthlyBreakdown: { month: string; income: number; dealValue: number; deals: number }[];
  currentMonthDaily: { day: number; income: number }[];
}

export async function getEarningsSummary(userId: string): Promise<EarningsSummary> {
  const deals = await getClosedDeals(userId);

  const now = new Date();
  const currentMonth = monthKey(now.getTime());

  const overallDealValue = deals.reduce((sum, d) => sum + d.dealValue, 0);
  const overallIncome = overallDealValue * COMMISSION_RATE;

  const currentMonthDeals = deals.filter((d) => monthKey(d.closedAt) === currentMonth);
  const currentMonthDealValue = currentMonthDeals.reduce((sum, d) => sum + d.dealValue, 0);
  const currentMonthIncome = currentMonthDealValue * COMMISSION_RATE;

  const byMonth = new Map<string, { dealValue: number; deals: number }>();
  for (const d of deals) {
    const key = monthKey(d.closedAt);
    const existing = byMonth.get(key) || { dealValue: 0, deals: 0 };
    existing.dealValue += d.dealValue;
    existing.deals += 1;
    byMonth.set(key, existing);
  }

  const monthlyBreakdown = [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, v]) => ({
      month,
      dealValue: v.dealValue,
      income: v.dealValue * COMMISSION_RATE,
      deals: v.deals,
    }));

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyMap = new Map<number, number>();
  for (const d of currentMonthDeals) {
    const day = new Date(d.closedAt).getDate();
    dailyMap.set(day, (dailyMap.get(day) || 0) + d.commission);
  }
  const currentMonthDaily = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    income: dailyMap.get(i + 1) || 0,
  }));

  return {
    overallIncome,
    overallDealValue,
    currentMonthIncome,
    currentMonthDealValue,
    dealsClosedCount: deals.length,
    currentMonthDealsCount: currentMonthDeals.length,
    monthlyBreakdown,
    currentMonthDaily,
  };
}
