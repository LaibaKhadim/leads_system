"use client";

import Tabs from "@/components/Tabs";
import {
  useEarningsSummary,
  EarningsSummaryCards,
  EarningsGraphs,
} from "@/components/EarningsDashboard";
import IncomeCalculator from "@/components/IncomeCalculator";

function OverviewTab() {
  const { summary, loading } = useEarningsSummary();
  if (loading) return <p className="text-slate">Loading...</p>;
  if (!summary) return <p className="text-slate">Couldn't load earnings.</p>;
  return <EarningsSummaryCards summary={summary} />;
}

function GraphsTab() {
  const { summary, loading } = useEarningsSummary();
  if (loading) return <p className="text-slate">Loading...</p>;
  if (!summary) return <p className="text-slate">Couldn't load earnings.</p>;
  return <EarningsGraphs summary={summary} />;
}

export default function RepEarningsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="ledger-index mb-1">EARNINGS</p>
        <h1 className="text-2xl font-semibold">Your income</h1>
      </div>

      <Tabs
        tabs={[
          { label: "Overview", content: <OverviewTab /> },
          { label: "Graphs", content: <GraphsTab /> },
          { label: "Calculator", content: <IncomeCalculator /> },
        ]}
      />
    </div>
  );
}
