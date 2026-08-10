import { getVerifiedSession, STALE_SESSION_RESPONSE } from "@/lib/session";
import { getEarningsSummary, getClosedDeals } from "@/lib/leads";
import { getUserById } from "@/lib/users";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const repIdParam = request.nextUrl.searchParams.get("repId");

  let targetUserId: string;

  if (session.user.role === "OWNER") {
    if (!repIdParam) {
      return NextResponse.json(
        { error: "repId is required for owner requests" },
        { status: 400 }
      );
    }
    const rep = await getUserById(repIdParam);
    if (!rep || rep.role !== "REP") {
      return NextResponse.json({ error: "Rep not found" }, { status: 404 });
    }
    targetUserId = repIdParam;
  } else {
    // Reps can only ever see their own earnings.
    targetUserId = session.user.id;
  }

  const summary = await getEarningsSummary(targetUserId);
  const closedDeals = await getClosedDeals(targetUserId);

  return NextResponse.json({ summary, closedDeals });
}
