"use client";

import { useEffect } from "react";

const CHECK_INTERVAL_MS = 20_000;

/**
 * Mounted inside the protected /owner and /rep layouts. Polls a lightweight
 * DB-backed endpoint so that if this account gets deleted/deactivated while
 * the user is sitting idle on a page (no navigation, no write request),
 * they still get kicked out within ~20s instead of staring at an empty
 * dashboard with a "logged in" session that no longer refers to anyone.
 */
export default function SessionWatcher() {
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/session/check", { cache: "no-store" });
        if (!cancelled && res.status === 401) {
          window.location.href = "/api/auth/force-logout?reason=account_removed";
        }
      } catch {
        // Network hiccup — don't log the user out over a transient failure.
      }
    }

    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return null;
}
