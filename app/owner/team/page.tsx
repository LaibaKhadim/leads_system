"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Rep {
  id: string;
  name: string;
  email: string;
  active: number;
  createdAt: number;
  overallIncome: number;
  currentMonthIncome: number;
  dealsClosedCount: number;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TeamPage() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [justCreated, setJustCreated] = useState<{ email: string; password: string } | null>(
    null
  );

  async function load() {
    setLoading(true);
    const res = await fetch("/api/team");
    if (res.ok) setReps(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(userId: string) {
    setReps((rs) =>
      rs.map((r) => (r.id === userId ? { ...r, active: r.active ? 0 : 1 } : r))
    );
    await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  }

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pw = "";
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pw);
  }

  async function createRep(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);

    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    setCreating(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create rep account");
      return;
    }

    setReps(await res.json());
    setJustCreated({ email, password });
    setName("");
    setEmail("");
    setPassword("");
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="ledger-index mb-1">TEAM</p>
          <h1 className="text-2xl font-semibold">Sales reps</h1>
          <p className="text-slate text-sm mt-1">
            Only you can create rep logins. Set a password below and share it with them directly.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "Add representative"}
        </button>
      </div>

      {justCreated && (
        <div className="card p-4 border border-green-600">
          <p className="text-sm">
            Account created for <strong>{justCreated.email}</strong>. Share these credentials
            with your rep — this password won't be shown again:
          </p>
          <p className="text-sm font-mono mt-2 bg-paper p-2 rounded inline-block">
            {justCreated.email} / {justCreated.password}
          </p>
          <button
            className="text-xs underline text-slate block mt-2"
            onClick={() => setJustCreated(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={createRep} className="card p-6 flex flex-col gap-4 max-w-md">
          <div>
            <label className="text-sm text-slate mb-1 block">Name</label>
            <input
              required
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-slate mb-1 block">Email</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-slate mb-1 block">Password</label>
            <div className="flex gap-2">
              <input
                required
                minLength={6}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={generatePassword}>
                Generate
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={creating} className="btn btn-primary self-start">
            {creating ? "Creating..." : "Create rep account"}
          </button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-slate">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Joined</th>
              <th className="p-3 font-medium">This month</th>
              <th className="p-3 font-medium">All-time earned</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && reps.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate">
                  No reps yet.
                </td>
              </tr>
            )}
            {reps.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="p-3 font-medium">
                  <Link href={`/owner/team/${r.id}`} className="underline">
                    {r.name}
                  </Link>
                </td>
                <td className="p-3 text-slate">{r.email}</td>
                <td className="p-3 text-slate">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="p-3">{fmt(r.currentMonthIncome)}</td>
                <td className="p-3">{fmt(r.overallIncome)}</td>
                <td className="p-3">{r.active ? "Active" : "Inactive"}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggle(r.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    {r.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
