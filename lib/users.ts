import db from "./db";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export type UserRole = "OWNER" | "REP";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: number;
  emailVerified: number;
  createdAt: number;
  updatedAt: number;
}

export async function createUser(
  email: string,
  name: string,
  password: string,
  role: UserRole
): Promise<(User & { verificationToken: string }) | null> {
  const id = randomUUID();
  const now = Date.now();
  const verificationToken = randomUUID();
  const tokenExpiry = now + 24 * 60 * 60 * 1000; // 24 hours

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);

    const stmt = db.prepare(
      `INSERT INTO users (id, email, name, password, role, active, emailVerified, verificationToken, verificationTokenExpiry, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?)`
    );

    await stmt.run(id, email, name, hashedPassword, role, verificationToken, tokenExpiry, now, now);

    return {
      id,
      email,
      name,
      role,
      active: 1,
      emailVerified: 0,
      createdAt: now,
      updatedAt: now,
      verificationToken,
    };
  } catch (error) {
    return null;
  }
}

export async function createRepByOwner(
  email: string,
  name: string,
  password: string
): Promise<User | null> {
  const id = randomUUID();
  const now = Date.now();

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);

    const stmt = db.prepare(
      `INSERT INTO users (id, email, name, password, role, active, emailVerified, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'REP', 1, 1, ?, ?)`
    );

    await stmt.run(id, email, name, hashedPassword, now, now);

    return {
      id,
      email,
      name,
      role: "REP",
      active: 1,
      emailVerified: 1,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    return null;
  }
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const user = (await db
    .prepare("SELECT * FROM users WHERE verificationToken = ? LIMIT 1")
    .get(token)) as any;

  if (!user) return false;
  if (user.verificationTokenExpiry && user.verificationTokenExpiry < Date.now()) return false;

  await db
    .prepare(
      "UPDATE users SET emailVerified = 1, verificationToken = NULL, verificationTokenExpiry = NULL, updatedAt = ? WHERE id = ?"
    )
    .run(Date.now(), user.id);

  return true;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const stmt = db.prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
  const result = (await stmt.get(email)) as User | undefined;
  return result || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const stmt = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
  const result = (await stmt.get(id)) as User | undefined;
  return result || null;
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function getAllReps(): Promise<User[]> {
  const stmt = db.prepare("SELECT * FROM users WHERE role = 'REP' ORDER BY name");
  return (await stmt.all()) as User[];
}

export async function toggleRepActive(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) return false;

  const stmt = db.prepare("UPDATE users SET active = ?, updatedAt = ? WHERE id = ?");
  const now = Date.now();
  await stmt.run(user.active === 1 ? 0 : 1, now, userId);
  return true;
}

export async function getRawUser(email: string): Promise<any> {
  const stmt = db.prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
  return await stmt.get(email);
}
