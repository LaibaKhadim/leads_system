import { getNotes, addNote, getLead } from "@/lib/leads";
import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession, STALE_SESSION_RESPONSE } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const { id } = await params;
  const notes = await getNotes(id);
  return NextResponse.json(notes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // addNote writes authorId as a foreign key referencing users(id), so use
  // the verified session (see lib/session.ts) rather than trusting the JWT.
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { content } = await request.json();
  if (!content) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  try {
    const note = await addNote(id, session.user.id, content);
    return NextResponse.json(note, { status: 201 });
  } catch (error: any) {
    if (error?.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
    }
    throw error;
  }
}
