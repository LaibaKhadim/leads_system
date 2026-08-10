import { createUser, getUserByEmail } from "@/lib/users";
import { sendVerificationEmail } from "@/lib/mail";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (role !== "OWNER") {
      return NextResponse.json(
        {
          error:
            "Public signup is only for owner accounts. Sales rep accounts are created by an owner from the Team page.",
        },
        { status: 403 }
      );
    }

    if (await getUserByEmail(email)) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    const user = await createUser(email, name, password, role);

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    const { sent, verifyUrl } = await sendVerificationEmail(
      user.email,
      user.name,
      user.verificationToken
    );

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailSent: sent,
        // Only meaningful when emailSent is false (no SMTP configured) — lets
        // the signup screen offer a direct verify link so new owners aren't
        // stuck with no way to activate their account. Safe to omit once
        // GMAIL_USER/GMAIL_APP_PASSWORD are set, since sent will be true.
        verifyUrl: sent ? undefined : verifyUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
