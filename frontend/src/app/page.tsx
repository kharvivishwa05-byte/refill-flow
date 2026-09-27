"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    createRefillCase,
    getCases,
} from "../services/api";

export default function Dashboard() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [patientName, setPatientName] = useState("");
  const [medication, setMedication] = useState("");
  const [pharmacyMessage, setPharmacyMessage] =
    useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    try {
      setLoading(true);
      setError("");
      const data = await getCases();
      setCases(data);
    } catch (error) {
      console.error("Failed to load cases:", error);
      setError(
        "Unable to connect to the backend on port 8000. Start the FastAPI server and refresh this page."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createCase() {
    if (
      !patientName.trim() ||
      !medication.trim() ||
      !pharmacyMessage.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      await createRefillCase({
        patient_name: patientName,
        medication,
        pharmacy_message: pharmacyMessage,
      });

      setPatientName("");
      setMedication("");
      setPharmacyMessage("");

      await loadCases();
    } catch (error: any) {
      console.error(
        "Failed to create refill case:",
        error
      );

      setError(
        error.message ||
          "Unable to create refill request"
      );
    } finally {
      setCreating(false);
    }
  }

  const totalCases = cases.length;

  const providerReviewCount = cases.filter(
    (c) => c.status === "PROVIDER_REVIEW"
  ).length;

  const approvedCount = cases.filter(
    (c) => c.status === "APPROVED"
  ).length;

  const resolvedCount = cases.filter(
    (c) => c.status === "RESOLVED"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-96 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">

        {/* Hero */}
        <section className="mb-10 animate-[fadeIn_.5s_ease-out]">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Operations Center
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                RefillFlow
                <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Operations Dashboard
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Monitor prescription refill requests,
                identify blockers, and move cases from
                pharmacy request to resolution.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Active workflow
              </p>

              <p className="mt-1 text-2xl font-bold text-white">
                {providerReviewCount}
              </p>

              <p className="text-xs text-slate-400">
                Awaiting provider review
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Cases"
            value={totalCases}
            subtitle="All refill requests"
            icon="↗"
            accent="cyan"
          />

          <StatCard
            title="Provider Review"
            value={providerReviewCount}
            subtitle="Requires intervention"
            icon="!"
            accent="amber"
          />

          <StatCard
            title="Approved"
            value={approvedCount}
            subtitle="Ready for pharmacy"
            icon="✓"
            accent="blue"
          />

          <StatCard
            title="Resolved"
            value={resolvedCount}
            subtitle="Successfully completed"
            icon="✓"
            accent="emerald"
          />
        </section>

        {/* AI Prescription Assistant Promo Banner */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-blue-950/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-2xl font-bold text-white shadow-lg shadow-cyan-500/20">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-cyan-400/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">New B2B Feature</span>
                  <span className="text-xs text-slate-400">• OCR & Vision Extraction</span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">AI Prescription Intelligence Assistant</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Upload PDF prescriptions, JPG/PNG images, or scanned documents. Automatically extract Patient, Medication, Dosage, SIG, Doctor License, and Refills into verified structured JSON.
                </p>
              </div>
            </div>
            <Link
              href="/prescription-assistant"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-400/20 transition hover:bg-cyan-300 hover:scale-[1.02]"
            >
              Open AI Prescription Assistant →
            </Link>
          </div>
        </section>

        {/* Create request */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-5 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                +
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  Create Refill Request
                </h2>

                <p className="text-sm text-slate-500">
                  Start a new pharmacy refill workflow
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            <div className="grid gap-5 lg:grid-cols-2">
              <InputField
                label="Patient Name"
                placeholder="e.g. Ravi Kumar"
                value={patientName}
                onChange={setPatientName}
              />

              <InputField
                label="Medication"
                placeholder="e.g. Metformin 500mg"
                value={medication}
                onChange={setMedication}
              />

              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Pharmacy Message
                </label>

                <textarea
                  rows={4}
                  placeholder="Describe the refill issue received from the pharmacy..."
                  value={pharmacyMessage}
                  onChange={(e) =>
                    setPharmacyMessage(e.target.value)
                  }
                  className="w-full resize-none rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-400/5"
                />
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={createCase}
                disabled={creating}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative z-10">
                  {creating
                    ? "Creating Request..."
                    : "Create Refill Request →"}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Cases */}
        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Refill Cases
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Live workflow activity
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-400">
              {totalCases} cases
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-14 text-center">
              <h3 className="font-semibold text-white">
                Loading refill cases...
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Connecting to the workflow service.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-8 text-center">
              <h3 className="font-semibold text-red-200">
                Backend connection failed
              </h3>

              <p className="mt-2 text-sm text-red-300/80">
                {error}
              </p>
            </div>
          ) : cases.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl text-slate-500">
                ∅
              </div>

              <h3 className="mt-4 font-semibold text-white">
                No refill cases yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create your first refill request above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cases.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/cases/${item.case_id}`}
                  className="group block animate-[slideUp_.4s_ease-out]"
                  style={{
                    animationDelay: `${index * 60}ms`,
                  }}
                >
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-black/20 lg:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-bold text-blue-400">
                          RF
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-bold text-white">
                              {item.case_id}
                            </h3>

                            <StatusBadge
                              status={item.status}
                            />
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            {item.patient_name}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:min-w-[560px]">
                        <Info
                          label="Medication"
                          value={item.medication}
                        />

                        <Info
                          label="Blocker"
                          value={item.blocker}
                        />

                        <Info
                          label="Owner"
                          value={item.owner}
                        />

                        <Info
                          label="Priority"
                          value={item.priority}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
                      <span className="text-xs text-slate-600">
                        Confidence: {item.confidence}
                      </span>

                      <span className="text-sm font-medium text-cyan-400 transition group-hover:translate-x-1">
                        View case details →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  accent: "cyan" | "amber" | "blue" | "emerald";
}) {
  const colors = {
    cyan: "bg-cyan-400/10 text-cyan-400",
    amber: "bg-amber-400/10 text-amber-400",
    blue: "bg-blue-400/10 text-blue-400",
    emerald: "bg-emerald-400/10 text-emerald-400",
  };

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.06]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">
          {title}
        </span>

        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold ${colors[accent]}`}
        >
          {icon}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-3xl font-bold text-white">
          {value}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-400/5"
      />
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-medium text-slate-300">
        {value}
      </p>
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
      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${styles}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}