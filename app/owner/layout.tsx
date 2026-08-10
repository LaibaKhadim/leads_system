import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import SessionWatcher from "@/components/SessionWatcher";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getVerifiedSession (not auth()) checks the token's user still exists
  // and is active in the current DB — a signed JWT can otherwise outlive
  // a deleted/deactivated account.
  const session = await getVerifiedSession();

  if (!session) {
    redirect("/api/auth/force-logout?reason=account_removed");
  }

  if (session.user.role !== "OWNER") {
    redirect("/rep");
  }

  return (
    <div className="flex min-h-screen">
      <SessionWatcher />
      <Sidebar role="OWNER" userName={session.user.name || ""} />
      <main className="flex-1 p-8">
        <div className="container-main">{children}</div>
      </main>
    </div>
  );
}
