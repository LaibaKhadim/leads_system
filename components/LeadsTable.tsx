"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";

interface Rep {
  id: string;
  name: string;
}

interface LeadRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  source: string | null;
  leadDate: string | null;
  status: string;
  assignedToId: string | null;
  dealValue: number | null;
  priceQuoted: number | null;
  clientBudget: number | null;
  extraData: Record<string, string> | null;
  tags: { id: string; label: string; color: string }[];
  noteCount: number;
}

function money(n: number | null | undefined) {
  return n != null ? n.toLocaleString() : "—";
}

const STATUSES = ["New", "Contacted", "Interested", "Converted", "Lost"];

export default function LeadsTable({
  basePath,
  showAssign,
  reps,
}: {
  basePath: string;
  showAssign?: boolean;
  reps?: Rep[];
}) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAssignTo, setBulkAssignTo] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    const res = await fetch(`/api/leads?${params.toString()}`);
    if (res.ok) {
      setLeads(await res.json());
    }
    setLoading(false);
  }, [status, search]);

  useEffect(() => {
    const t = setTimeout(fetchLeads, 250);
    return () => clearTimeout(t);
  }, [fetchLeads]);

  useEffect(() => {
    // Drop any selected ids that fell out of the current filtered view
    setSelected((s) => new Set([...s].filter((id) => leads.some((l) => l.id === id))));
  }, [leads]);

  function toggleOne(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((s) =>
      s.size === leads.length ? new Set() : new Set(leads.map((l) => l.id))
    );
  }

  async function assignSelected() {
    if (selected.size === 0) return;
    setBulkAssigning(true);
    await fetch("/api/leads/bulk-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: [...selected], userId: bulkAssignTo || null }),
    });
    setBulkAssigning(false);
    setSelected(new Set());
    fetchLeads();
  }

  async function assignAll() {
    setBulkAssigning(true);
    await fetch("/api/leads/bulk-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true, userId: bulkAssignTo || null }),
    });
    setBulkAssigning(false);
    setSelected(new Set());
    fetchLeads();
  }

  async function changeStatus(leadId: string, newStatus: string) {
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function changeAssignment(leadId: string, userId: string) {
    setLeads((ls) =>
      ls.map((l) => (l.id === leadId ? { ...l, assignedToId: userId || null } : l))
    );
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: userId || null }),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          className="input input-sm max-w-xs"
          placeholder="Search name, email, phone, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input input-sm max-w-[160px]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <a
          href={`/api/leads/export${status ? `?status=${status}` : ""}`}
          className="btn btn-secondary btn-sm ml-auto"
        >
          Export .xlsx
        </a>
      </div>

      {showAssign && (
        <div className="flex flex-wrap gap-3 items-center card-sm p-3">
          <span className="text-sm text-slate">
            {selected.size > 0 ? `${selected.size} selected` : "Assign leads:"}
          </span>
          <select
            className="input input-sm max-w-[180px]"
            value={bulkAssignTo}
            onChange={(e) => setBulkAssignTo(e.target.value)}
          >
            <option value="">Unassigned</option>
            {reps?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-secondary btn-sm"
            disabled={selected.size === 0 || bulkAssigning}
            onClick={assignSelected}
          >
            Assign selected
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={leads.length === 0 || bulkAssigning}
            onClick={assignAll}
            title="Assigns every lead matching the current filters, not just this page"
          >
            Assign all ({leads.length})
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-slate">
              {showAssign && (
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selected.size === leads.length}
                    onChange={toggleAll}
                  />
                </th>
              )}
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Contact</th>
              <th className="p-3 font-medium">Company</th>
              <th className="p-3 font-medium">Source</th>
              <th className="p-3 font-medium">Price quoted</th>
              <th className="p-3 font-medium">Price closed</th>
              <th className="p-3 font-medium">Budget</th>
              <th className="p-3 font-medium">Status</th>
              {showAssign && <th className="p-3 font-medium">Assigned</th>}
              <th className="p-3 font-medium">Notes</th>
              <th className="p-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={showAssign ? 12 : 10} className="p-6 text-center text-slate">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={showAssign ? 12 : 10} className="p-6 text-center text-slate">
                  No leads found.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <Fragment key={lead.id}>
              <tr className="border-b border-line last:border-0 hover:bg-paper">
                {showAssign && (
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleOne(lead.id)}
                    />
                  </td>
                )}
                <td className="p-3">
                  <Link href={`${basePath}/${lead.id}`} className="font-medium underline">
                    {lead.name}
                  </Link>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {lead.tags.map((t) => (
                      <span
                        key={t.id}
                        className="tag-pill"
                        style={{ backgroundColor: `${t.color}22`, color: t.color }}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-slate">
                  <div>{lead.email}</div>
                  <div>{lead.phone}</div>
                </td>
                <td className="p-3">{lead.company || "—"}</td>
                <td className="p-3">{lead.source || "—"}</td>
                <td className="p-3">{money(lead.priceQuoted)}</td>
                <td className="p-3">{money(lead.dealValue)}</td>
                <td className="p-3">{money(lead.clientBudget)}</td>
                <td className="p-3">
                  <select
                    className="input input-sm"
                    value={lead.status}
                    onChange={(e) => changeStatus(lead.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                {showAssign && (
                  <td className="p-3">
                    <select
                      className="input input-sm"
                      value={lead.assignedToId || ""}
                      onChange={(e) => changeAssignment(lead.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {reps?.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="p-3 text-slate">{lead.noteCount}</td>
                <td className="p-3">
                  <button
                    className="text-xs underline text-slate"
                    onClick={() => toggleExpanded(lead.id)}
                  >
                    {expanded.has(lead.id) ? "Hide" : "View all"}
                  </button>
                </td>
              </tr>
              {expanded.has(lead.id) && (
                <tr className="border-b border-line last:border-0 bg-paper">
                  <td colSpan={showAssign ? 12 : 10} className="p-4">
                    {lead.extraData && Object.keys(lead.extraData).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                        {Object.entries(lead.extraData).map(([key, value]) => (
                          <div key={key} className="min-w-0">
                            <p className="text-slate">{key}</p>
                            <p className="break-words">{String(value) || "—"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate">
                        No extra imported columns for this lead.
                      </p>
                    )}
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
