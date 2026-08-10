"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ClosedDeal {
  id: string;
  name: string;
  company: string | null;
  dealValue: number;
  commission: number;
  closedAt: number;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ClosedDealsTable({
  repId,
  linkBase,
}: {
  repId?: string;
  linkBase: string;
}) {
  const [deals, setDeals] = useState<ClosedDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = repId ? `/api/earnings?repId=${repId}` : "/api/earnings";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setDeals(data.closedDeals || []);
        setLoading(false);
      });
  }, [repId]);

  if (loading) return <p className="text-slate">Loading...</p>;

  const totalValue = deals.reduce((s, d) => s + d.dealValue, 0);
  const totalCommission = deals.reduce((s, d) => s + d.commission, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-6">
        <div>
          <p className="text-xs text-slate">Total deal value</p>
          <p className="text-xl font-semibold">{fmt(totalValue)}</p>
        </div>
        <div>
          <p className="text-xs text-slate">Total commission</p>
          <p className="text-xl font-semibold">{fmt(totalCommission)}</p>
        </div>
        <div>
          <p className="text-xs text-slate">Deals closed</p>
          <p className="text-xl font-semibold">{deals.length}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-slate">
              <th className="p-3 font-medium">Lead</th>
              <th className="p-3 font-medium">Company</th>
              <th className="p-3 font-medium">Deal value</th>
              <th className="p-3 font-medium">Commission (20%)</th>
              <th className="p-3 font-medium">Closed</th>
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate">
                  No closed deals yet.
                </td>
              </tr>
            )}
            {deals.map((d) => (
              <tr key={d.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="p-3">
                  <Link href={`${linkBase}/${d.id}`} className="underline">
                    {d.name}
                  </Link>
                </td>
                <td className="p-3 text-slate">{d.company || "—"}</td>
                <td className="p-3">{fmt(d.dealValue)}</td>
                <td className="p-3">{fmt(d.commission)}</td>
                <td className="p-3 text-slate">{new Date(d.closedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
