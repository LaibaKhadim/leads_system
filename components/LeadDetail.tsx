"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import StatusBadge from "./StatusBadge";

const STATUSES = ["New", "Contacted", "Interested", "Converted", "Lost"];
const TAG_COLORS = ["#2563eb", "#16a34a", "#ca8a04", "#dc2626", "#7c3aed", "#0891b2"];

interface Rep {
  id: string;
  name: string;
}

export default function LeadDetail({
  leadId,
  showAssign,
  reps,
}: {
  leadId: string;
  showAssign?: boolean;
  reps?: Rep[];
}) {
  const { data: session } = useSession();
  const [lead, setLead] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [tagLabel, setTagLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [dealValueInput, setDealValueInput] = useState("");
  const [editingFields, setEditingFields] = useState(false);
  const [fieldDraft, setFieldDraft] = useState<Record<string, string>>({});
  const [savingFields, setSavingFields] = useState(false);

  const load = useCallback(async () => {
    const [leadRes, notesRes] = await Promise.all([
      fetch(`/api/leads/${leadId}`),
      fetch(`/api/leads/${leadId}/notes`),
    ]);
    if (leadRes.ok) {
      const l = await leadRes.json();
      setLead(l);
      setDealValueInput(l.dealValue != null ? String(l.dealValue) : "");
    }
    if (notesRes.ok) setNotes(await notesRes.json());
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(newStatus: string) {
    if (newStatus === "Converted" && !lead.dealValue && !dealValueInput) {
      // Deal value isn't set yet — status still changes, but nudge for the value.
      setLead((l: any) => ({ ...l, status: newStatus }));
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      return;
    }
    setLead((l: any) => ({ ...l, status: newStatus }));
    const body: any = { status: newStatus };
    if (newStatus === "Converted" && dealValueInput) {
      body.dealValue = parseFloat(dealValueInput);
    }
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  async function saveDealValue() {
    const value = parseFloat(dealValueInput);
    if (isNaN(value) || value < 0) return;
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealValue: value }),
    });
    load();
  }

  function startEditFields() {
    setFieldDraft({
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      company: lead.company || "",
      city: lead.city || "",
      source: lead.source || "",
      leadDate: lead.leadDate || "",
      priceQuoted: lead.priceQuoted != null ? String(lead.priceQuoted) : "",
      clientBudget: lead.clientBudget != null ? String(lead.clientBudget) : "",
    });
    setEditingFields(true);
  }

  function cancelEditFields() {
    setEditingFields(false);
    setFieldDraft({});
  }

  async function saveFields() {
    setSavingFields(true);
    const body: Record<string, any> = {
      name: fieldDraft.name,
      email: fieldDraft.email || null,
      phone: fieldDraft.phone || null,
      company: fieldDraft.company || null,
      city: fieldDraft.city || null,
      source: fieldDraft.source || null,
      leadDate: fieldDraft.leadDate || null,
      priceQuoted: fieldDraft.priceQuoted ? parseFloat(fieldDraft.priceQuoted) : null,
      clientBudget: fieldDraft.clientBudget ? parseFloat(fieldDraft.clientBudget) : null,
    };
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingFields(false);
    setEditingFields(false);
    load();
  }

  async function changeAssignment(userId: string) {
    setLead((l: any) => ({ ...l, assignedToId: userId || null }));
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: userId || null }),
    });
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText }),
    });
    if (res.ok) {
      setNoteText("");
      load();
    }
  }

  function startEditNote(note: any) {
    setEditingNoteId(note.id);
    setEditingText(note.content);
  }

  function cancelEditNote() {
    setEditingNoteId(null);
    setEditingText("");
  }

  async function saveEditNote(noteId: string) {
    if (!editingText.trim()) return;
    const res = await fetch(`/api/leads/${leadId}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editingText }),
    });
    if (res.ok) {
      setEditingNoteId(null);
      setEditingText("");
      load();
    }
  }

  async function deleteNote(noteId: string) {
    const res = await fetch(`/api/leads/${leadId}/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function submitTag(e: React.FormEvent) {
    e.preventDefault();
    if (!tagLabel.trim()) return;
    const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
    const res = await fetch(`/api/leads/${leadId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: tagLabel, color }),
    });
    if (res.ok) {
      setTagLabel("");
      load();
    }
  }

  async function removeTag(tagId: string) {
    await fetch(`/api/leads/${leadId}/tags?tagId=${tagId}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p className="text-slate">Loading...</p>;
  if (!lead) return <p className="text-slate">Lead not found.</p>;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="ledger-index mb-1">LEAD</p>
            {editingFields ? (
              <input
                className="input font-semibold text-xl"
                value={fieldDraft.name}
                onChange={(e) => setFieldDraft((f) => ({ ...f, name: e.target.value }))}
              />
            ) : (
              <h1 className="text-2xl font-semibold">{lead.name}</h1>
            )}
            {!editingFields && (
              <p className="text-slate mt-1">
                {lead.email} {lead.email && lead.phone && "·"} {lead.phone}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={lead.status} />
            {!editingFields && (
              <button className="btn btn-secondary btn-sm" onClick={startEditFields}>
                Edit
              </button>
            )}
          </div>
        </div>

        {editingFields ? (
          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            {[
              ["email", "Email"],
              ["phone", "Phone"],
              ["company", "Company"],
              ["city", "City"],
              ["source", "Source"],
              ["leadDate", "Lead date"],
              ["priceQuoted", "Price quoted"],
              ["clientBudget", "Client budget"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-slate block mb-1">{label}</label>
                <input
                  type={key === "priceQuoted" || key === "clientBudget" ? "number" : "text"}
                  className="input input-sm"
                  value={fieldDraft[key] ?? ""}
                  onChange={(e) =>
                    setFieldDraft((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div className="col-span-2 flex gap-2 mt-1">
              <button
                className="btn btn-primary btn-sm"
                onClick={saveFields}
                disabled={savingFields}
              >
                {savingFields ? "Saving..." : "Save changes"}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={cancelEditFields}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div>
              <p className="text-slate">Company</p>
              <p>{lead.company || "—"}</p>
            </div>
            <div>
              <p className="text-slate">City</p>
              <p>{lead.city || "—"}</p>
            </div>
            <div>
              <p className="text-slate">Source</p>
              <p>{lead.source || "—"}</p>
            </div>
            <div>
              <p className="text-slate">Lead date</p>
              <p>{lead.leadDate || "—"}</p>
            </div>
            <div>
              <p className="text-slate">Price quoted</p>
              <p>{lead.priceQuoted != null ? lead.priceQuoted.toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-slate">Client budget</p>
              <p>{lead.clientBudget != null ? lead.clientBudget.toLocaleString() : "—"}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 mt-6">
          <div>
            <label className="text-xs text-slate block mb-1">Status</label>
            <select
              className="input input-sm"
              value={lead.status}
              onChange={(e) => changeStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {showAssign && (
            <div>
              <label className="text-xs text-slate block mb-1">Assigned to</label>
              <select
                className="input input-sm"
                value={lead.assignedToId || ""}
                onChange={(e) => changeAssignment(e.target.value)}
              >
                <option value="">Unassigned</option>
                {reps?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {lead.status === "Converted" && (
            <div>
              <label className="text-xs text-slate block mb-1">
                Price closed ({(20).toFixed(0)}% commission)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input input-sm max-w-[140px]"
                  placeholder="0.00"
                  value={dealValueInput}
                  onChange={(e) => setDealValueInput(e.target.value)}
                />
                <button className="btn btn-secondary btn-sm" onClick={saveDealValue}>
                  Save
                </button>
              </div>
              {lead.dealValue != null && (
                <p className="text-xs text-slate mt-1">
                  Commission: {(lead.dealValue * 0.2).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {lead.extraData && Object.keys(lead.extraData).length > 0 && (
        <div className="card p-6">
          <p className="ledger-index mb-3">ALL IMPORTED DATA</p>
          <p className="text-xs text-slate mb-3">
            Columns from the uploaded file that don't map to a standard field.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {Object.entries(lead.extraData).map(([key, value]) => (
              <div key={key} className="min-w-0">
                <p className="text-slate text-xs">{key}</p>
                <p className="break-words">{String(value) || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6">
        <p className="ledger-index mb-3">TAGS</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {lead.tags.map((t: any) => (
            <span
              key={t.id}
              className="tag-pill cursor-pointer"
              style={{ backgroundColor: `${t.color}22`, color: t.color }}
              onClick={() => removeTag(t.id)}
              title="Click to remove"
            >
              {t.label} ×
            </span>
          ))}
          {lead.tags.length === 0 && <p className="text-slate text-sm">No tags yet.</p>}
        </div>
        <form onSubmit={submitTag} className="flex gap-2">
          <input
            className="input input-sm max-w-xs"
            placeholder="New tag label"
            value={tagLabel}
            onChange={(e) => setTagLabel(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            Add tag
          </button>
        </form>
      </div>

      <div className="card p-6">
        <p className="ledger-index mb-3">NOTES</p>
        <form onSubmit={submitNote} className="flex flex-col gap-2 mb-4">
          <textarea
            className="input"
            rows={3}
            placeholder="Add a note about this lead..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <button type="submit" className="btn btn-primary self-start">
            Add note
          </button>
        </form>

        <div className="flex flex-col gap-3">
          {notes.length === 0 && <p className="text-slate text-sm">No notes yet.</p>}
          {notes.map((n) => {
            const canEdit =
              session?.user?.id === n.authorId || session?.user?.role === "OWNER";
            return (
              <div key={n.id} className="card-sm p-3">
                {editingNoteId === n.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      className="input"
                      rows={3}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => saveEditNote(n.id)}
                      >
                        Save
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={cancelEditNote}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{n.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate">
                        {n.authorName || "Unknown"} · {new Date(n.createdAt).toLocaleString()}
                      </p>
                      {canEdit && (
                        <div className="flex gap-2">
                          <button
                            className="text-xs underline text-slate"
                            onClick={() => startEditNote(n)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs underline text-slate"
                            onClick={() => deleteNote(n.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
