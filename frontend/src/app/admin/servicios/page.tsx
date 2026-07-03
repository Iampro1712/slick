"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/client";
import type { ServiceAdmin } from "@/lib/types";
import { Card, EmptyState, Pill, Spinner } from "@/components/ui";

/** Vista de supervisión (solo lectura). La configuración la hace el dueño. */
export default function AdminServiciosPage() {
  const [services, setServices] = useState<ServiceAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.admin.services
      .list()
      .then(({ services }) => setServices(services))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Servicios</h1>
        <p className="mt-0.5 text-sm text-muted">
          Supervisión (solo lectura). El dueño configura los servicios.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-3 text-muted">
          <Spinner /> Cargando…
        </div>
      ) : error ? (
        <EmptyState>No se pudieron cargar los servicios.</EmptyState>
      ) : services.length === 0 ? (
        <EmptyState>El negocio aún no tiene servicios.</EmptyState>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {services.map((s) => (
            <div key={s.id} className="flex items-center gap-4 p-4 sm:px-5">
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
                  {s.duration_min} min
                  {s.buffer_min > 0 ? ` · +${s.buffer_min} min margen` : ""}
                  {s.description ? ` · ${s.description}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm text-muted">
                {s.appointments_count} cita{s.appointments_count === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
