import { getUserById } from "@/lib/users";
import { notFound } from "next/navigation";
import EarningsDashboard from "@/components/EarningsDashboard";
import ClosedDealsTable from "@/components/ClosedDealsTable";
import Link from "next/link";

export default async function RepEarningsForOwnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rep = await getUserById(id);

  if (!rep || rep.role !== "REP") {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/owner/team" className="text-sm text-slate underline">
          ← Back to team
        </Link>
        <p className="ledger-index mt-3 mb-1">REP EARNINGS</p>
        <h1 className="text-2xl font-semibold">{rep.name}</h1>
        <p className="text-slate text-sm">{rep.email}</p>
      </div>

      <EarningsDashboard repId={id} />

      <div>
        <p className="ledger-index mb-3">CLOSED DEALS</p>
        <ClosedDealsTable repId={id} linkBase="/owner/leads" />
      </div>
    </div>
  );
}
