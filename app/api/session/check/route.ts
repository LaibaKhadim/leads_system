import { NextResponse } from "next/server";
import { getVerifiedSession, STALE_SESSION_RESPONSE } from "@/lib/session";

// Polled by <SessionWatcher/> so an account deletion/deactivation is caught
// even if the user never navigates or hits a write endpoint — e.g. they're
// just sitting on a page reading data when an owner removes their account.
export async function GET() {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }
  return NextResponse.json({ valid: true });
}
