import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import SessionWatcher from "@/components/SessionWatcher";

export default async function RepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getVerifiedSession();

  if (!session) {
    redirect("/api/auth/force-logout?reason=account_removed");
  }

  if (session.user.role !== "REP") {
    redirect("/owner");
  }

  return (
    <div className="flex min-h-screen">
      <SessionWatcher />
      <Sidebar role="REP" userName={session.user.name || ""} />
      <main className="flex-1 p-8">
        <div className="container-main">{children}</div>
      </main>
    </div>
  );
}
