import { NextRequest, NextResponse } from "next/server";

// Deletes the Auth.js session cookie directly and redirects to /login.
// Used whenever we've detected that a session token no longer corresponds
// to a real (or active) user in the database — e.g. their account was
// deleted or deactivated after the cookie was issued. A JWT session is
// only checked for a valid *signature*, not for the user still existing,
// so this is the piece that actually forces the browser to drop it.
export async function GET(req: NextRequest) {
  const reason = req.nextUrl.searchParams.get("reason") || "account_removed";
  const res = NextResponse.redirect(new URL(`/login?reason=${reason}`, req.url));

  // Auth.js v5 cookie names (default, non-prefixed on http, __Secure- prefixed on https)
  for (const name of [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ]) {
    res.cookies.set(name, "", { maxAge: 0, path: "/" });
  }

  return res;
}
