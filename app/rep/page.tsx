import LeadsTable from "@/components/LeadsTable";

export default function RepDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="ledger-index mb-1">REP VIEW</p>
        <h1 className="text-2xl font-semibold">My leads</h1>
      </div>

      <LeadsTable basePath="/rep/leads" />
    </div>
  );
}
