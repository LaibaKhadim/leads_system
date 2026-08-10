import { verifyEmailToken } from "@/lib/users";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/login?verify=missing", baseUrl));
  }

  const success = await verifyEmailToken(token);

  return NextResponse.redirect(
    new URL(success ? "/login?verify=success" : "/login?verify=invalid", baseUrl)
  );
}
