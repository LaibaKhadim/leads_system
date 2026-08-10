"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [staleSession, setStaleSession] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setStaleSession(false);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/leads/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Upload failed");
      if (data.code === "STALE_SESSION") setStaleSession(true);
      return;
    }

    setResult(data);
    setFile(null);
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <p className="ledger-index mb-1">BULK IMPORT</p>
        <h1 className="text-2xl font-semibold">Upload leads</h1>
        <p className="text-slate text-sm mt-1">
          Upload an .xlsx or .csv file. Name/business, email, phone, company, city,
          source, date, price quoted, and client budget columns are auto-detected —
          every other column is kept too and shown in full on each lead's page.
          Duplicate emails/phones are skipped automatically.
        </p>
      </div>

      <form onSubmit={handleUpload} className="card p-6 flex flex-col gap-4">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="input"
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="btn btn-primary self-start"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
        {error && (
          <div className="text-sm text-red-600">
            <p>{error}</p>
            {staleSession && (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="btn btn-primary mt-2"
              >
                Log out now
              </button>
            )}
          </div>
        )}
      </form>

      {result && (
        <div className="card p-6">
          <p className="ledger-index mb-2">RESULT</p>
          <p className="text-sm">Imported: {result.imported}</p>
          <p className="text-sm">Duplicates skipped: {result.duplicates}</p>
          {result.skippedNoName > 0 && (
            <p className="text-sm text-red-600">
              Skipped (no name/business value found): {result.skippedNoName}
            </p>
          )}
          {result.detectedHeaders && (
            <p className="text-xs text-slate mt-2">
              Detected columns: {result.detectedHeaders.join(", ")}
            </p>
          )}
          {result.imported > 0 && (
            <a href="/owner" className="text-sm underline mt-2 inline-block">
              View leads →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
