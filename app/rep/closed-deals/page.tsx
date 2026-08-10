import ClosedDealsTable from "@/components/ClosedDealsTable";

export default function RepClosedDealsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="ledger-index mb-1">CLOSED DEALS</p>
        <h1 className="text-2xl font-semibold">Your won deals</h1>
      </div>

      <ClosedDealsTable linkBase="/rep/leads" />
    </div>
  );
}
