"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  approveCase,
  confirmPharmacy,
  getAudit,
  getCase,
} from "@/services/api";

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

type AuditEvent = {
  id: number;
  case_id: string;
  event_type: string;
  description: string;
  actor: string;
  timestamp: string;
};

export default function CaseDetailsPage() {
  const params = useParams<{ id: string }>();
  const caseId = params.id;

  const [refillCase, setRefillCase] =
    useState<RefillCase | null>(null);

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (caseId) {
      loadCaseDetails();
    }
  }, [caseId]);

  async function loadCaseDetails() {
    try {
      setLoading(true);
      setError(null);

      const [caseData, auditData] =
        await Promise.all([
          getCase(caseId),
          getAudit(caseId),
        ]);

      setRefillCase(caseData);
      setEvents(auditData);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load case"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    try {
      setActionLoading(true);
      setError(null);

      await approveCase(caseId);
      await loadCaseDetails();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to approve case"
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePharmacyConfirmation() {
    try {
      setActionLoading(true);
      setError(null);

      await confirmPharmacy(caseId);
      await loadCaseDetails();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to confirm pharmacy"
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 lg:p-10">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-5 w-32 rounded bg-white/10" />
          <div className="mt-8 h-10 w-72 rounded bg-white/10" />

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="h-72 rounded-2xl bg-white/5" />
            <div className="h-72 rounded-2xl bg-white/5" />
          </div>
        </div>
      </main>
    );
  }

  if (error && !refillCase) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 lg:p-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-400/20 bg-red-400/10 p-8">
          <p className="text-red-300">{error}</p>

          <Link
            href="/"
            className="mt-5 inline-block text-sm font-semibold text-cyan-400"
          >
            ← Return to dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!refillCase) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-12">

        <Link
          href="/"
          className="text-sm font-medium text-slate-500 transition hover:text-cyan-400"
        >
          ← Back to dashboard
        </Link>

        {/* Header */}
        <div className="mt-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 font-bold text-blue-400">
                RF
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Refill Case
                </p>

                <h1 className="text-3xl font-bold text-white">
                  {refillCase.case_id}
                </h1>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Refill case details and workflow history
            </p>
          </div>

          <StatusBadge status={refillCase.status} />
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Information */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <SectionTitle
              title="Refill Information"
              subtitle="Patient and request details"
            />

            <div className="mt-7 space-y-5">
              <Detail
                label="Patient"
                value={refillCase.patient_name}
              />

              <Detail
                label="Medication"
                value={refillCase.medication}
              />

              <Detail
                label="Blocker"
                value={refillCase.blocker}
              />

              <div className="grid grid-cols-2 gap-5">
                <Detail
                  label="Priority"
                  value={refillCase.priority}
                />

                <Detail
                  label="Confidence"
                  value={String(
                    refillCase.confidence
                  )}
                />
              </div>
            </div>
          </div>

          {/* Workflow */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <SectionTitle
              title="Current Workflow"
              subtitle="Resolution progress"
            />

            <div className="mt-7">
              <WorkflowStep
                label="Request Received"
                complete
              />

              <WorkflowStep
                label="AI Investigation"
                complete
              />

              <WorkflowStep
                label="Blocker Identified"
                complete
              />

              <WorkflowStep
                label="Provider Review"
                complete={[
                  "PROVIDER_REVIEW",
                  "APPROVED",
                  "RESOLVED",
                ].includes(refillCase.status)}
              />

              <WorkflowStep
                label="Approved"
                complete={[
                  "APPROVED",
                  "RESOLVED",
                ].includes(refillCase.status)}
              />

              <WorkflowStep
                label="Resolved"
                complete={
                  refillCase.status === "RESOLVED"
                }
                last
              />
            </div>

            <div className="mt-7 rounded-xl border border-white/5 bg-slate-950/50 p-4">
              <div className="flex justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-600">
                  Current owner
                </span>

                <span className="text-sm font-semibold text-slate-300">
                  {refillCase.owner}
                </span>
              </div>
            </div>

            <div className="mt-5">
              {refillCase.status ===
                "PROVIDER_REVIEW" && (
                <ActionButton
                  onClick={handleApprove}
                  loading={actionLoading}
                  text="Approve Refill"
                />
              )}

              {refillCase.status === "APPROVED" && (
                <ActionButton
                  onClick={handlePharmacyConfirmation}
                  loading={actionLoading}
                  text="Confirm Pharmacy Receipt"
                  blue
                />
              )}

              {refillCase.status === "RESOLVED" && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-300">
                  ✓ Refill workflow completed successfully
                </div>
              )}

              {![
                "PROVIDER_REVIEW",
                "APPROVED",
                "RESOLVED",
              ].includes(refillCase.status) && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-300">
                  Waiting for action from{" "}
                  <strong>{refillCase.owner}</strong>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <SectionTitle
            title="Audit Timeline"
            subtitle="Complete workflow history"
          />

          <div className="mt-8">
            {events.map((event, index) => (
              <div
                key={event.id}
                className="relative flex gap-4 pb-8 last:pb-0"
              >
                {index !== events.length - 1 && (
                  <div className="absolute left-[15px] top-8 h-full w-px bg-gradient-to-b from-cyan-400/40 to-transparent" />
                )}

                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-xs text-cyan-400">
                  ✓
                </div>

                <div className="flex-1 rounded-xl border border-white/5 bg-slate-950/40 p-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row">
                    <p className="font-semibold text-white">
                      {event.event_type}
                    </p>

                    <p className="text-xs text-slate-600">
                      {event.timestamp
                        ? new Date(
                            event.timestamp
                          ).toLocaleString()
                        : ""}
                    </p>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {event.description}
                  </p>

                  <p className="mt-3 text-xs text-slate-600">
                    Actor: {event.actor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="font-semibold text-white">
        {title}
      </h2>

      <p className="mt-1 text-xs text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-200">
        {value}
      </p>
    </div>
  );
}

function WorkflowStep({
  label,
  complete,
  last = false,
}: {
  label: string;
  complete: boolean;
  last?: boolean;
}) {
  return (
    <div className="relative flex gap-4">
      {!last && (
        <div
          className={`absolute left-[13px] top-7 h-8 w-px ${
            complete
              ? "bg-emerald-400/40"
              : "bg-white/10"
          }`}
        />
      )}

      <div
        className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
          complete
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
            : "border-white/10 bg-white/5 text-slate-600"
        }`}
      >
        {complete ? "✓" : "•"}
      </div>

      <span
        className={`pt-1 text-sm ${
          complete
            ? "font-medium text-slate-200"
            : "text-slate-600"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "RESOLVED"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : status === "APPROVED"
      ? "border-blue-400/20 bg-blue-400/10 text-blue-300"
      : status === "PROVIDER_REVIEW"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
      : "border-slate-400/20 bg-slate-400/10 text-slate-300";

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${styles}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function ActionButton({
  onClick,
  loading,
  text,
  blue = false,
}: {
  onClick: () => void;
  loading: boolean;
  text: string;
  blue?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
        blue
          ? "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-500/20"
          : "bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/20"
      }`}
    >
      {loading ? "Processing..." : text}
    </button>
  );
}