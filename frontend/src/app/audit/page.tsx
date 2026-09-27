"use client";

import { useEffect, useState } from "react";
import { getAudit } from "@/services/api";

export default function AuditPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudit();
  }, []);

  async function loadAudit() {
    try {
      setLoading(true);

      const data = await getAudit("RF-002");
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8 lg:py-14">

        {/* Header */}
        <div className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />

            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Activity Log
            </span>
          </div>

          <h1 className="text-4xl font-bold text-white">
            Audit Timeline
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Complete event history for refill case{" "}
            <span className="font-semibold text-slate-300">
              RF-002
            </span>
          </p>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl lg:p-8">
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse gap-4"
                >
                  <div className="h-8 w-8 rounded-full bg-white/10" />

                  <div className="flex-1">
                    <div className="h-4 w-40 rounded bg-white/10" />
                    <div className="mt-3 h-12 rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-xl text-slate-500">
                ∅
              </div>

              <p className="mt-4 text-sm text-slate-500">
                No audit events found.
              </p>
            </div>
          ) : (
            <div>
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className="relative flex gap-5 pb-8 last:pb-0"
                >
                  {index !== events.length - 1 && (
                    <div className="absolute left-4 top-9 h-full w-px bg-gradient-to-b from-cyan-400/40 to-transparent" />
                  )}

                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-xs font-bold text-cyan-400">
                    ✓
                  </div>

                  <div className="flex-1 rounded-xl border border-white/5 bg-slate-950/40 p-5 transition hover:border-cyan-400/10 hover:bg-slate-900/60">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row">
                      <h3 className="font-semibold text-white">
                        {event.event_type}
                      </h3>

                      <span className="text-xs text-slate-600">
                        {event.timestamp
                          ? new Date(
                              event.timestamp
                            ).toLocaleString()
                          : ""}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {event.description}
                    </p>

                    <div className="mt-4 inline-flex rounded-lg bg-white/5 px-3 py-1.5">
                      <span className="text-xs text-slate-500">
                        Actor:
                      </span>

                      <span className="ml-2 text-xs font-medium text-slate-300">
                        {event.actor}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}