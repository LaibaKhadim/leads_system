"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailSent, setEmailSent] = useState(true);
  const [verifyUrl, setVerifyUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role: "OWNER" }),
    });

    setLoading(false);

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create account");
      return;
    }

    setEmailSent(!!data.emailSent);
    setVerifyUrl(data.verifyUrl || "");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-4">
        <div className="card w-full max-w-sm p-8 text-center">
          <p className="ledger-index mb-2">ALMOST THERE</p>
          <h1 className="text-2xl font-semibold mb-4">Check your email</h1>
          {emailSent ? (
            <p className="text-sm text-slate mb-6">
              We sent a verification link to <strong>{email}</strong>. Click it to
              activate your account, then sign in.
            </p>
          ) : (
            <div className="text-sm text-slate mb-6 flex flex-col gap-3">
              <p>
                Outgoing email isn't set up on this server yet, so we couldn't send a
                verification link to <strong>{email}</strong>.
              </p>
              {verifyUrl && (
                <a href={verifyUrl} className="btn btn-primary self-center">
                  Verify account now
                </a>
              )}
              <p className="text-xs text-slate">
                To send real verification emails, set GMAIL_USER and GMAIL_APP_PASSWORD
                in .env.local (see README).
              </p>
            </div>
          )}
          <Link href="/login" className="text-ink font-medium underline text-sm">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="card w-full max-w-sm p-8">
        <p className="ledger-index mb-2">NEW ACCOUNT</p>
        <h1 className="text-2xl font-semibold mb-2">Create owner account</h1>
        <p className="text-sm text-slate mb-6">
          This creates an account with full access. To give a sales rep their
          own login, create an owner account first, then add them from the
          Team page.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary mt-2">
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-slate mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-ink font-medium underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
