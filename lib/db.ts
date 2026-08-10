import { createClient, type Client, type InValue } from "@libsql/client";

// Turso (libSQL) in production, a local file in dev — same client library
// either way, since Turso *is* SQLite over the network. This keeps a single
// code path instead of branching the whole data layer on NODE_ENV.
const url = process.env.TURSO_DATABASE_URL || "file:leads.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client: Client = createClient(
  url.startsWith("file:") ? { url } : { url, authToken }
);

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('OWNER', 'REP')),
    active INTEGER DEFAULT 1,
    emailVerified INTEGER DEFAULT 0,
    verificationToken TEXT,
    verificationTokenExpiry INTEGER,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    city TEXT,
    source TEXT,
    leadDate TEXT,
    status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'Contacted', 'Interested', 'Converted', 'Lost')),
    assignedToId TEXT,
    dealValue REAL,
    priceQuoted REAL,
    clientBudget REAL,
    extraData TEXT,
    closedAt INTEGER,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    batchId TEXT,
    FOREIGN KEY (assignedToId) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    leadId TEXT NOT NULL,
    authorId TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (leadId) REFERENCES leads(id),
    FOREIGN KEY (authorId) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    leadId TEXT NOT NULL,
    label TEXT NOT NULL,
    color TEXT DEFAULT '#888888',
    createdBy TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (leadId) REFERENCES leads(id),
    FOREIGN KEY (createdBy) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    leadId TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (leadId) REFERENCES leads(id)
  )`,
  `CREATE TABLE IF NOT EXISTS upload_batches (
    id TEXT PRIMARY KEY,
    uploadedBy TEXT NOT NULL,
    count INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (uploadedBy) REFERENCES users(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_assignedTo ON leads(assignedToId)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_leadId ON notes(leadId)`,
  `CREATE INDEX IF NOT EXISTS idx_tags_leadId ON tags(leadId)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_leadId ON activity(leadId)`,
];

async function columnExists(table: string, column: string): Promise<boolean> {
  const res = await client.execute(`PRAGMA table_info(${table})`);
  return res.rows.some((row) => (row as any).name === column);
}

let readyPromise: Promise<void> | null = null;

// Schema init/migration runs once per warm serverless instance (or once at
// dev-server startup), memoized here instead of running at module load —
// the old better-sqlite3 code ran this synchronously at import time, which
// isn't possible now that every call is a network round trip.
function ready(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      for (const stmt of SCHEMA_STATEMENTS) {
        await client.execute(stmt);
      }

      // Migration: add columns to existing databases created before these
      // features existed (CREATE TABLE IF NOT EXISTS doesn't alter existing tables).
      if (!(await columnExists("users", "emailVerified"))) {
        await client.execute("ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0");
        // Existing users created before verification existed are grandfathered in as verified.
        await client.execute(
          "UPDATE users SET emailVerified = 1 WHERE emailVerified IS NULL OR emailVerified = 0"
        );
      }
      if (!(await columnExists("users", "verificationToken"))) {
        await client.execute("ALTER TABLE users ADD COLUMN verificationToken TEXT");
      }
      if (!(await columnExists("users", "verificationTokenExpiry"))) {
        await client.execute("ALTER TABLE users ADD COLUMN verificationTokenExpiry INTEGER");
      }
      if (!(await columnExists("leads", "dealValue"))) {
        await client.execute("ALTER TABLE leads ADD COLUMN dealValue REAL");
      }
      if (!(await columnExists("leads", "closedAt"))) {
        await client.execute("ALTER TABLE leads ADD COLUMN closedAt INTEGER");
      }
      if (!(await columnExists("leads", "priceQuoted"))) {
        await client.execute("ALTER TABLE leads ADD COLUMN priceQuoted REAL");
      }
      if (!(await columnExists("leads", "clientBudget"))) {
        await client.execute("ALTER TABLE leads ADD COLUMN clientBudget REAL");
      }
      if (!(await columnExists("leads", "extraData"))) {
        await client.execute("ALTER TABLE leads ADD COLUMN extraData TEXT");
      }
    })();
  }
  return readyPromise;
}

// Mimics the better-sqlite3 `.prepare(sql).get/all/run(...params)` shape
// so lib/users.ts and lib/leads.ts didn't need a full rewrite — just
// `await` added at each call site. Every method is async now.
function prepare(sql: string) {
  return {
    async get(...params: InValue[]): Promise<any> {
      await ready();
      const res = await client.execute({ sql, args: params });
      return res.rows[0];
    },
    async all(...params: InValue[]): Promise<any[]> {
      await ready();
      const res = await client.execute({ sql, args: params });
      return res.rows;
    },
    async run(...params: InValue[]) {
      await ready();
      const res = await client.execute({ sql, args: params });
      return { changes: res.rowsAffected, lastInsertRowid: res.lastInsertRowid };
    },
  };
}

const db = { prepare, client, ready };
export default db;
