import { getVerifiedSession, STALE_SESSION_RESPONSE } from "@/lib/session";
import { createLead, getLeads } from "@/lib/leads";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const fromDate = url.searchParams.get("fromDate") || undefined;
  const toDate = url.searchParams.get("toDate") || undefined;

  let assignedToId: string | null | undefined = undefined;
  if (session.user.role === "REP") {
    assignedToId = session.user.id;
  }

  const leads = await getLeads({
    status: status as any,
    assignedToId,
    search: search || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  return NextResponse.json(leads);
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  try {
    const data = await request.json();
    const lead = await createLead(data);
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 400 }
    );
  }
}
