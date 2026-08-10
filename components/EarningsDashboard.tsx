"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Summary {
  overallIncome: number;
  overallDealValue: number;
  currentMonthIncome: number;
  currentMonthDealValue: number;
  dealsClosedCount: number;
  currentMonthDealsCount: number;
  monthlyBreakdown: { month: string; income: number; dealValue: number; deals: number }[];
  currentMonthDaily: { day: number; income: number }[];
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

export function useEarningsSummary(repId?: string) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = repId ? `/api/earnings?repId=${repId}` : "/api/earnings";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setSummary(data.summary);
        setLoading(false);
      });
  }, [repId]);

  return { summary, loading };
}

export function EarningsSummaryCards({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card p-4">
        <p className="text-xs text-slate">This month</p>
        <p className="text-2xl font-semibold mt-1">{fmt(summary.currentMonthIncome)}</p>
        <p className="text-xs text-slate mt-1">{summary.currentMonthDealsCount} deals closed</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-slate">All-time income</p>
        <p className="text-2xl font-semibold mt-1">{fmt(summary.overallIncome)}</p>
        <p className="text-xs text-slate mt-1">{summary.dealsClosedCount} deals closed</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-slate">This month deal value</p>
        <p className="text-2xl font-semibold mt-1">{fmt(summary.currentMonthDealValue)}</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-slate">All-time deal value</p>
        <p className="text-2xl font-semibold mt-1">{fmt(summary.overallDealValue)}</p>
      </div>
    </div>
  );
}

export function EarningsGraphs({ summary }: { summary: Summary }) {
  const growthData = summary.monthlyBreakdown.map((m) => ({
    label: monthLabel(m.month),
    income: Math.round(m.income * 100) / 100,
  }));

  const dailyData = summary.currentMonthDaily.map((d) => ({
    day: d.day,
    income: Math.round(d.income * 100) / 100,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6">
        <p className="ledger-index mb-4">CURRENT MONTH — DAILY INCOME</p>
        {dailyData.every((d) => d.income === 0) ? (
          <p className="text-slate text-sm">No deals closed yet this month.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Bar dataKey="income" fill="#2563eb" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card p-6">
        <p className="ledger-index mb-4">OVERALL GROWTH — INCOME BY MONTH</p>
        {growthData.length === 0 ? (
          <p className="text-slate text-sm">No closed deals yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function EarningsDashboard({ repId }: { repId?: string }) {
  const { summary, loading } = useEarningsSummary(repId);

  if (loading) return <p className="text-slate">Loading...</p>;
  if (!summary) return <p className="text-slate">Couldn't load earnings.</p>;

  return (
    <div className="flex flex-col gap-6">
      <EarningsSummaryCards summary={summary} />
      <EarningsGraphs summary={summary} />
    </div>
  );
}
