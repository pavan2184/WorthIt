"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { DecisionDashboard } from "@/components/DecisionDashboard";
import { getDecision } from "@/lib/api";
import type { SavedDecision } from "@/lib/types";

type DecisionDetailClientProps = {
  id: string;
};

export function DecisionDetailClient({ id }: DecisionDetailClientProps) {
  const [saved, setSaved] = useState<SavedDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDecision() {
      setLoading(true);
      setError(null);

      try {
        const loaded = await getDecision(id);
        setSaved(loaded);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load decision");
      } finally {
        setLoading(false);
      }
    }

    void loadDecision();
  }, [id]);

  return (
    <main className="min-h-screen bg-worth-page">
      <AppHeader />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div>
          {loading && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-subtle">
              Loading decision...
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {saved && (
            <DecisionDashboard
              initialDecisionId={saved.id}
              initialDecision={saved.payload}
              initialResult={saved.result}
            />
          )}
        </div>
      </div>
    </main>
  );
}
