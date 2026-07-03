"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/client";
import type { DashboardData } from "@/lib/types";
import {
  Avatar,
  Card,
  EmptyState,
  Input,
  Select,
  Spinner,
  StatCard,
  StatusBadge,
} from "@/components/ui";

function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

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

  async function changeStatus(id: number, status: string) {
    setUpdating(id);
    try {
      await api.admin.updateStatus(id, status);
      load(date);
    } finally {
      setUpdating(null);
    }
  }

  // Métricas reales derivadas de las citas del día.
  const stats = useMemo(() => {
    const items = data?.appointments ?? [];
    const by = (s: string) => items.filter((a) => a.status === s).length;
    return {
      total: items.length,
      confirmed: by("confirmed"),
      pending: by("pending"),
      completed: by("completed"),
    };
  }, [data]);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Resumen</h1>
          <p className="mt-0.5 text-sm text-muted">
            {data ? data.date_label : "Agenda del día"}
          </p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
      </header>

      {/* Métricas */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Citas del día"
          value={loading ? "—" : stats.total}
          accent="primary"
          icon={<IconCalendar />}
        />
        <StatCard
          label="Confirmadas"
          value={loading ? "—" : stats.confirmed}
          accent="emerald"
          icon={<IconCheck />}
        />
        <StatCard
          label="Pendientes"
          value={loading ? "—" : stats.pending}
          accent="amber"
          icon={<IconClock />}
        />
        <StatCard
          label="Completadas"
          value={loading ? "—" : stats.completed}
          accent="slate"
          icon={<IconCheck />}
        />
      </div>

      {/* Citas del día */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Citas del día
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-muted">
          <Spinner /> Cargando…
        </div>
      ) : !data || data.appointments.length === 0 ? (
        <EmptyState>No hay citas para este día.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          {/* Cabecera (desktop) */}
          <div className="hidden grid-cols-[1fr_1.2fr_auto_auto] gap-4 border-b border-line bg-surface-muted/60 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-faint sm:grid">
            <span>Cliente</span>
            <span>Servicio</span>
            <span>Hora</span>
            <span className="text-right">Estado</span>
          </div>
          <div className="divide-y divide-line">
            {data.appointments.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-1 items-center gap-3 px-5 py-3.5 sm:grid-cols-[1fr_1.2fr_auto_auto] sm:gap-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={a.client} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{a.client}</p>
                    {a.client_phone && (
                      <p className="truncate text-xs text-muted">{a.client_phone}</p>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted">
                  <span className="text-ink">{a.service}</span> · {a.staff}
                </div>
                <div className="font-mono text-sm tabular-nums text-ink">
                  {a.starts_at}
                  <span className="text-faint">–{a.ends_at}</span>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <StatusBadge status={a.status} label={a.status_label} />
                  <Select
                    value={a.status}
                    disabled={updating === a.id}
                    onChange={(e) => changeStatus(a.id, e.target.value)}
                    className="w-auto py-1.5 text-sm"
                    aria-label={`Cambiar estado de la cita de ${a.client}`}
                  >
                    {data.statuses.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
      <path
        d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
      <path
        d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
