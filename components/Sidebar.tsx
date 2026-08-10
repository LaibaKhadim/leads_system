"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function Sidebar({
  role,
  userName,
}: {
  role: "OWNER" | "REP";
  userName: string;
}) {
  const pathname = usePathname();
  const base = role === "OWNER" ? "/owner" : "/rep";

  const links =
    role === "OWNER"
      ? [
          { href: "/owner", label: "Leads" },
          { href: "/owner/upload", label: "Upload" },
          { href: "/owner/team", label: "Team" },
        ]
      : [
          { href: "/rep", label: "My Leads" },
          { href: "/rep/earnings", label: "Earnings" },
          { href: "/rep/closed-deals", label: "Closed Deals" },
        ];

  return (
    <aside className="sidebar w-56 shrink-0">
      <div>
        <p className="ledger-index text-white/60">LEADS SYSTEM</p>
        <p className="font-semibold mt-1">{userName}</p>
        <p className="text-xs text-white/60">{role === "OWNER" ? "Owner" : "Sales rep"}</p>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`sidebar-item ${
              pathname === link.href ? "active" : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="sidebar-item text-left mt-auto text-white/80"
      >
        Sign out
      </button>
    </aside>
  );
}
