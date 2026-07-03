"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/client";
import type { DashboardData } from "@/lib/types";
import { Avatar, Card, EmptyState, Input, Spinner, StatusBadge } from "@/components/ui";

function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/** Agenda del día en modo supervisión (solo lectura, sin cambiar estados). */
export default function AdminAgendaPage() {
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((d: string) => {
    setLoading(true);
    api.admin
      .dashboard(d)
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Agenda</h1>
          <p className="mt-0.5 text-sm text-muted">
            {data ? data.date_label : "Supervisión del día (solo lectura)."}
          </p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
      </header>

      {loading ? (
        <div className="flex items-center gap-3 text-muted">
          <Spinner /> Cargando…
        </div>
      ) : !data || data.appointments.length === 0 ? (
        <EmptyState>No hay citas para este día.</EmptyState>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {data.appointments.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5"
            >
              <div className="flex items-center gap-3">
                <Avatar name={a.client} />
                <div>
                  <p className="font-medium text-ink">{a.client}</p>
                  <p className="text-sm text-muted">
                    {a.service} · {a.staff}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm tabular-nums text-ink">
                  {a.starts_at}
                  <span className="text-faint">–{a.ends_at}</span>
                </span>
                <StatusBadge status={a.status} label={a.status_label} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
