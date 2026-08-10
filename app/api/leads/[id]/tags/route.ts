import { getLead, addTag, removeTag } from "@/lib/leads";
import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession, STALE_SESSION_RESPONSE } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // addTag writes createdBy as a foreign key referencing users(id), so use
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

  const { label, color } = await request.json();
  if (!label) {
    return NextResponse.json(
      { error: "Label is required" },
      { status: 400 }
    );
  }

  try {
    const tag = await addTag(id, label, color || "#888888", session.user.id);
    return NextResponse.json(tag, { status: 201 });
  } catch (error: any) {
    if (error?.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
    }
    throw error;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const url = new URL(request.url);
  const tagId = url.searchParams.get("tagId");

  if (!tagId) {
    return NextResponse.json(
      { error: "tagId is required" },
      { status: 400 }
    );
  }

  const success = await removeTag(tagId);
  if (!success) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
