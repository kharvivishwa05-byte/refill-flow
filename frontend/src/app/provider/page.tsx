"use client";

import { approveCase, confirmPharmacy, getCases } from "@/services/api";
import { useEffect, useState } from "react";

type RefillCase = {
  id: number;
  case_id: string;
  patient_name: string;
  medication: string;
  status: string;
  blocker: string;
  owner: string;
  priority: string;
  confidence: number;
};

export default function ProviderPage() {
  const [loading, setLoading] = useState<"approve" | "confirm" | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refillCase, setRefillCase] = useState<RefillCase | null>(null);

  async function refreshCase() {
    try {
      const cases = await getCases();
      const activeCase =
        cases.find((caseItem: RefillCase) => caseItem.status === "PROVIDER_REVIEW") ??
        cases.find((caseItem: RefillCase) => caseItem.status === "APPROVED") ??
        cases.find((caseItem: RefillCase) => caseItem.status === "RESOLVED") ??
        null;

      setRefillCase(activeCase);
      setError(activeCase ? null : "No provider-review cases are available right now.");
    } catch (caughtError) {
      console.error("Failed to load provider case:", caughtError);
      setError("Unable to load provider case");
      setRefillCase(null);
    }
  }

  useEffect(() => {
    async function loadCase() {
      setPageLoading(true);
      await refreshCase();
      setPageLoading(false);
    }

    loadCase();
  }, []);

  async function handleApprove() {
    if (!refillCase) return;

    try {
      setLoading("approve");
      setError(null);

      await approveCase(refillCase.case_id);
      await refreshCase();
    } catch (caughtError) {
      console.error("Approval failed:", caughtError);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to approve case");
    } finally {
      setLoading(null);
    }
  }

  async function handleConfirm() {
    if (!refillCase) return;

    try {
      setLoading("confirm");
      setError(null);

      await confirmPharmacy(refillCase.case_id);
      await refreshCase();
    } catch (caughtError) {
      console.error("Pharmacy confirmation failed:", caughtError);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to confirm pharmacy");
    } finally {
      setLoading(null);
    }
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-slate-300">
          Loading provider review queue...
        </div>
      </main>
    );
  }

  if (!refillCase) {
    return (
      <main className="min-h-screen bg-slate-950 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-amber-400/20 bg-amber-400/10 p-8 text-amber-300">
          {error || "No active provider review case found."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-80 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-14">
        <div className="mb-8 animate-[fadeIn_.5s_ease-out]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
              Clinical Workflow
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Provider Review
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Review and resolve prescription refill requests requiring provider intervention.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur-xl animate-[slideUp_.5s_ease-out]">
          <div className="border-b border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-black text-white shadow-lg shadow-blue-500/20">
                  R
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                    Refill Case
                  </p>

                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
                    {refillCase.case_id}
                  </h2>
                </div>
              </div>

              <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 ${statusStyles(refillCase.status)}`}>
                <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {refillCase.status.replaceAll("_", " ")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid border-b border-white/10 md:grid-cols-3">
            <InfoCard label="Patient" value={refillCase.patient_name} />
            <InfoCard label="Medication" value={refillCase.medication} />
            <InfoCard label="Blocker" value={refillCase.blocker} highlight />
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Decision Center
              </p>

              <h3 className="mt-2 text-xl font-semibold text-white">
                Provider Action
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Select the next action for this refill workflow.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {refillCase.status === "PROVIDER_REVIEW" && (
                <button
                  onClick={handleApprove}
                  disabled={loading !== null}
                  className="group relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-emerald-400/[0.08] hover:shadow-xl hover:shadow-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-xl text-emerald-400 transition-transform duration-300 group-hover:scale-110">
                      ✓
                    </div>
                    <span className="text-2xl text-emerald-400 transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </div>

                  <h4 className="mt-6 text-lg font-semibold text-white">
                    {loading === "approve" ? "Approving..." : "Approve Refill"}
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Approve the refill request and move the case forward to pharmacy processing.
                  </p>
                  <div className="mt-5 h-px w-0 bg-emerald-400/40 transition-all duration-500 group-hover:w-full" />
                </button>
              )}

              {refillCase.status === "APPROVED" && (
                <button
                  onClick={handleConfirm}
                  disabled={loading !== null}
                  className="group relative overflow-hidden rounded-2xl border border-blue-400/20 bg-blue-400/[0.04] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/40 hover:bg-blue-400/[0.08] hover:shadow-xl hover:shadow-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-400/10 text-xl text-blue-400 transition-transform duration-300 group-hover:scale-110">
                      ✓
                    </div>
                    <span className="text-2xl text-blue-400 transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </div>

                  <h4 className="mt-6 text-lg font-semibold text-white">
                    {loading === "confirm" ? "Confirming..." : "Pharmacy Confirm"}
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Confirm pharmacy receipt and complete the refill workflow.
                  </p>
                  <div className="mt-5 h-px w-0 bg-blue-400/40 transition-all duration-500 group-hover:w-full" />
                </button>
              )}

              {refillCase.status === "RESOLVED" && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6 text-emerald-300">
                  <p className="text-lg font-semibold">✓ Workflow complete</p>
                  <p className="mt-2 text-sm text-emerald-200">This refill case has already been resolved.</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/50 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-sm text-cyan-400">
                i
              </div>

              <p className="text-xs leading-5 text-slate-500">
                Provider approval moves the case into the pharmacy workflow. Pharmacy confirmation completes the current refill workflow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r md:last:border-r-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">{label}</p>
      <p className={`mt-2 text-base font-medium ${highlight ? "text-cyan-300" : "text-slate-200"}`}>
        {value}
      </p>
    </div>
  );
}

function statusStyles(status: string) {
  if (status === "RESOLVED") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }
  if (status === "APPROVED") {
    return "border-blue-400/20 bg-blue-400/10 text-blue-300";
  }
  if (status === "PROVIDER_REVIEW") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }
  return "border-slate-400/20 bg-slate-400/10 text-slate-300";
}
