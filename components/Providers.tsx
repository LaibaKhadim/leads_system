"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";

// Wraps window.fetch once so that ANY API call anywhere in the app —
// not just the ones we've explicitly wired up — reacts immediately to a
// STALE_SESSION response (session's user no longer exists/active in the
// DB) by clearing the cookie and bouncing to /login. This is the
// "act on it right away" counterpart to <SessionWatcher/>'s idle polling.
function useStaleSessionInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        try {
          const clone = response.clone();
          const body = await clone.json();
          if (body?.code === "STALE_SESSION") {
            window.location.href = "/api/auth/force-logout?reason=account_removed";
          }
        } catch {
          // Not JSON, or already consumed — ignore.
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);
}

export default function Providers({ children }: { children: React.ReactNode }) {
  useStaleSessionInterceptor();
  return <SessionProvider>{children}</SessionProvider>;
}
