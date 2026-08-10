"use client";

import { useEffect, useRef, useState } from "react";

const COMMISSION_RATE = 0.2;

function fmt(n: number) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Smoothly animates a displayed number toward `target` whenever it changes,
// instead of snapping — makes every keystroke in the calculator feel alive.
function useAnimatedNumber(target: number, durationMs = 400) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min(1, (ts - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const from = fromRef.current;
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

function AnimatedStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  const animated = useAnimatedNumber(value);
  return (
    <div className="card-sm p-4 transition-transform duration-300 hover:-translate-y-0.5">
      <p className="text-xs text-slate">{label}</p>
      <p className="text-2xl font-semibold mt-1 tabular-nums" style={{ color: accent }}>
        {fmt(animated)}
      </p>
    </div>
  );
}

export default function IncomeCalculator() {
  const [dealValue, setDealValue] = useState(5000);
  const [targetIncome, setTargetIncome] = useState(2000);
  const [avgDealSize, setAvgDealSize] = useState(3000);

  const commission = dealValue * COMMISSION_RATE;
  const requiredDealValue = targetIncome / COMMISSION_RATE;
  const dealsNeeded = avgDealSize > 0 ? requiredDealValue / avgDealSize : 0;
  const dealsNeededRounded = avgDealSize > 0 ? Math.ceil(dealsNeeded) : 0;

  // Progress bar: how close a single deal at `dealValue` gets you toward
  // the monthly target — purely illustrative, animates via CSS transition.
  const progressPct = targetIncome > 0 ? Math.min(100, (commission / targetIncome) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatedStat label="Commission on this deal" value={commission} accent="#2563eb" />
        <AnimatedStat label="Deal value needed for target" value={requiredDealValue} accent="#16a34a" />
        <AnimatedStat
          label="Deals needed at avg size"
          value={avgDealSize > 0 ? dealsNeeded : 0}
          accent="#ca8a04"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <p className="ledger-index mb-4">DEAL → COMMISSION</p>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate">Deal value</label>
            <span className="text-sm font-semibold tabular-nums">{fmt(dealValue)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={50000}
            step={100}
            value={dealValue}
            onChange={(e) => setDealValue(Number(e.target.value))}
            className="w-full accent-[#2563eb]"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            className="input mt-3"
            value={dealValue}
            onChange={(e) => setDealValue(Number(e.target.value) || 0)}
          />

          <p className="text-sm text-slate mt-4">
            Your commission at {(COMMISSION_RATE * 100).toFixed(0)}%:{" "}
            <span className="text-ink font-semibold">{fmt(commission)}</span>
          </p>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate mb-1">
              <span>Progress toward monthly target</span>
              <span>{progressPct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-line overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, #2563eb, #16a34a)",
                }}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <p className="ledger-index mb-4">TARGET INCOME → DEALS NEEDED</p>

          <label className="text-xs text-slate block mb-1">Target monthly income</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input mb-1"
            value={targetIncome}
            onChange={(e) => setTargetIncome(Number(e.target.value) || 0)}
          />
          <input
            type="range"
            min={0}
            max={20000}
            step={100}
            value={targetIncome}
            onChange={(e) => setTargetIncome(Number(e.target.value))}
            className="w-full accent-[#16a34a] mb-4"
          />

          <label className="text-xs text-slate block mb-1">Average deal size</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input mb-1"
            value={avgDealSize}
            onChange={(e) => setAvgDealSize(Number(e.target.value) || 0)}
          />
          <input
            type="range"
            min={0}
            max={20000}
            step={100}
            value={avgDealSize}
            onChange={(e) => setAvgDealSize(Number(e.target.value))}
            className="w-full accent-[#ca8a04]"
          />

          <div className="text-sm text-slate mt-4 flex flex-col gap-1">
            <p>
              Total deal value needed:{" "}
              <span className="text-ink font-semibold">{fmt(requiredDealValue)}</span>
            </p>
            {avgDealSize > 0 && (
              <p>
                Deals needed at that average size:{" "}
                <span className="text-ink font-semibold">{dealsNeededRounded}</span>
              </p>
            )}
          </div>

          {avgDealSize > 0 && dealsNeededRounded > 0 && (
            <div className="flex gap-1.5 mt-4 flex-wrap">
              {Array.from({ length: Math.min(dealsNeededRounded, 30) }).map((_, i) => (
                <span
                  key={i}
                  className="w-3 h-3 rounded-full animate-[pulse_1.6s_ease-in-out_infinite]"
                  style={{
                    backgroundColor: "#ca8a04",
                    animationDelay: `${i * 60}ms`,
                  }}
                  title="One deal"
                />
              ))}
              {dealsNeededRounded > 30 && (
                <span className="text-xs text-slate self-center">+{dealsNeededRounded - 30} more</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
