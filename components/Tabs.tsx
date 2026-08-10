"use client";

import { useState } from "react";

export default function Tabs({
  tabs,
}: {
  tabs: { label: string; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative flex gap-1 border-b border-line">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              active === i ? "text-ink" : "text-slate hover:text-ink"
            }`}
          >
            {t.label}
            {active === i && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-ink rounded-full transition-all duration-300" />
            )}
          </button>
        ))}
      </div>

      <div key={active} className="animate-[fadeIn_0.25s_ease-out]">
        {tabs[active].content}
      </div>
    </div>
  );
}
