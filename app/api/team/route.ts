import { getVerifiedSession, STALE_SESSION_RESPONSE } from "@/lib/session";
import { getAllReps, toggleRepActive, createRepByOwner, getUserByEmail, User } from "@/lib/users";
import { getEarningsSummary } from "@/lib/leads";
import { NextRequest, NextResponse } from "next/server";

function sanitize(reps: User[]) {
  return reps.map(({ password, ...rest }: any) => rest);
}

async function withEarnings(reps: User[]) {
  return Promise.all(
    sanitize(reps).map(async (rep: any) => {
      const summary = await getEarningsSummary(rep.id);
      return {
        ...rep,
        overallIncome: summary.overallIncome,
        currentMonthIncome: summary.currentMonthIncome,
        dealsClosedCount: summary.dealsClosedCount,
      };
    })
  );
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const reps = await getAllReps();
  return NextResponse.json(await withEarnings(reps));
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  if (await getUserByEmail(email)) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const rep = await createRepByOwner(email, name, password);
  if (!rep) {
    return NextResponse.json({ error: "Failed to create rep account" }, { status: 500 });
  }

  const reps = await getAllReps();
  return NextResponse.json(await withEarnings(reps), { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getVerifiedSession();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json(STALE_SESSION_RESPONSE, { status: 401 });
  }

  const { userId, active } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  await toggleRepActive(userId);
  const reps = await getAllReps();
  return NextResponse.json(await withEarnings(reps));
}
