import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Uses the edge-safe auth config (no better-sqlite3 import) since
// middleware runs in the Edge runtime.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;

  // If accessing /owner routes, user must be OWNER
  if (pathname.startsWith("/owner")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session.user.role !== "OWNER") {
      return NextResponse.redirect(new URL("/rep", req.url));
    }
  }

  // If accessing /rep routes, user must be REP
  if (pathname.startsWith("/rep")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session.user.role !== "REP") {
      return NextResponse.redirect(new URL("/owner", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/owner/:path*", "/rep/:path*"],
};
