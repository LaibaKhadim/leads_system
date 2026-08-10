import { getVerifiedSession, STALE_SESSION_RESPONSE } from "@/lib/session";
import { getNoteById, updateNote, deleteNote } from "@/lib/leads";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const { noteId } = await params;
  const note = await getNoteById(noteId);

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  if (note.authorId !== session.user.id && session.user.role !== "OWNER") {
    return NextResponse.json(
      { error: "You can only edit your own notes" },
      { status: 403 }
    );
  }

  const { content } = await request.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  await updateNote(noteId, content.trim());
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const { noteId } = await params;
  const note = await getNoteById(noteId);

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  if (note.authorId !== session.user.id && session.user.role !== "OWNER") {
    return NextResponse.json(
      { error: "You can only delete your own notes" },
      { status: 403 }
    );
  }

  await deleteNote(noteId);
  return NextResponse.json({ success: true });
}
