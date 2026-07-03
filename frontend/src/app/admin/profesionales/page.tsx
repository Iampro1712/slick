"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/client";
import type { StaffMemberAdmin, WorkingHour } from "@/lib/types";
import { Avatar, Card, EmptyState, Pill, Spinner } from "@/components/ui";

const WEEKDAYS = [
  { weekday: 1, short: "Lun" },
  { weekday: 2, short: "Mar" },
  { weekday: 3, short: "Mié" },
  { weekday: 4, short: "Jue" },
  { weekday: 5, short: "Vie" },
  { weekday: 6, short: "Sáb" },
  { weekday: 0, short: "Dom" },
];

type ServiceOption = { id: number; name: string };

/** Vista de supervisión (solo lectura). El dueño configura los profesionales. */
export default function AdminProfesionalesPage() {
  const [staff, setStaff] = useState<StaffMemberAdmin[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.admin.staff
      .list()
      .then((d) => {
        setStaff(d.staff);
        setServices(d.services);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  function serviceNames(ids: number[]) {
    const names = services.filter((s) => ids.includes(s.id)).map((s) => s.name);
    return names.length ? names.join(", ") : "Sin servicios";
  }

  function daysSummary(hours: WorkingHour[]) {
    const days = WEEKDAYS.filter((d) => hours.some((h) => h.weekday === d.weekday)).map(
      (d) => d.short
    );
    return days.length ? days.join(" · ") : "Sin horario";
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Profesionales
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          Supervisión (solo lectura). El dueño configura los profesionales.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-3 text-muted">
          <Spinner /> Cargando…
        </div>
      ) : error ? (
        <EmptyState>No se pudieron cargar los profesionales.</EmptyState>
      ) : staff.length === 0 ? (
        <EmptyState>El negocio aún no tiene profesionales.</EmptyState>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center gap-4 p-4 sm:px-5">
              <Avatar name={s.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{s.name}</span>
                  {s.is_active ? (
                    <Pill tone="success">Activo</Pill>
                  ) : (
                    <Pill tone="muted">Inactivo</Pill>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {serviceNames(s.service_ids)}
                </p>
                <p className="mt-0.5 text-xs text-faint">{daysSummary(s.working_hours)}</p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
