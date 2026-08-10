import { getAllReps } from "@/lib/users";
import { getLeadStats } from "@/lib/leads";
import LeadsTable from "@/components/LeadsTable";

export default async function OwnerDashboard() {
  const reps = await getAllReps();
  const stats = await getLeadStats();

  const statCards = [
    { label: "Total", value: stats.total },
    { label: "New", value: stats.byStatus.New },
    { label: "Contacted", value: stats.byStatus.Contacted },
    { label: "Interested", value: stats.byStatus.Interested },
    { label: "Converted", value: stats.byStatus.Converted },
    { label: "Unassigned", value: stats.unassigned },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="ledger-index mb-1">OWNER VIEW</p>
        <h1 className="text-2xl font-semibold">Leads</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="card-sm p-4">
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-slate">{s.label}</p>
          </div>
        ))}
      </div>

      <LeadsTable
        basePath="/owner/leads"
        showAssign
        reps={reps.map((r) => ({ id: r.id, name: r.name }))}
      />
    </div>
  );
}
