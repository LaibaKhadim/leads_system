import { getVerifiedSession, STALE_SESSION_RESPONSE } from "@/lib/session";
import { bulkAssignLeads, getAllLeadIds } from "@/lib/leads";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const body = await request.json();
  const { leadIds, userId, all } = body;

  const ids: string[] = all ? await getAllLeadIds() : Array.isArray(leadIds) ? leadIds : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "No leads to assign" }, { status: 400 });
  }

  const count = await bulkAssignLeads(ids, userId || null);

  return NextResponse.json({ success: true, assigned: count });
}
