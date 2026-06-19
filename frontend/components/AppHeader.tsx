"use client";

import Link from "next/link";
import { BarChart3, ListChecks, Plus } from "lucide-react";

type AppHeaderProps = {
  active?: "new" | "history";
  variant?: "light" | "brand";
};

export function AppHeader({ active, variant = "light" }: AppHeaderProps) {
  const isBrand = variant === "brand";

  return (
    <header
      className={`border-b ${
        isBrand
          ? "border-white/20 bg-worth-brand"
          : "border-worth-border bg-worth-surface"
      }`}
    >
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isBrand ? "bg-white text-worth-brand" : "bg-worth-brand text-white"
            }`}
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span
            className={`text-base font-semibold ${
              isBrand ? "text-white" : "text-worth-ink"
            }`}
          >
            WorthIt
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/decision/new"
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition ${
              active === "new"
                ? isBrand
                  ? "bg-white text-worth-brand"
                  : "bg-worth-brand text-white"
                : isBrand
                  ? "border border-white/30 bg-white/10 text-white hover:border-white/60 hover:bg-white/15"
                  : "border border-worth-border bg-worth-surface text-worth-muted hover:border-worth-brand hover:text-worth-brand"
            }`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New
          </Link>
          <Link
            href="/decisions"
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition ${
              active === "history"
                ? isBrand
                  ? "bg-white text-worth-brand"
                  : "bg-worth-brand text-white"
                : isBrand
                  ? "border border-white/30 bg-white/10 text-white hover:border-white/60 hover:bg-white/15"
                  : "border border-worth-border bg-worth-surface text-worth-muted hover:border-worth-brand hover:text-worth-brand"
            }`}
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            My Decisions
          </Link>
        </nav>
      </div>
    </header>
  );
}
