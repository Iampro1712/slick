"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/client";
import { useConfirm } from "@/lib/confirm";
import type { AppointmentView } from "@/lib/types";
import { PublicNav } from "@/components/PublicNav";
import { Avatar, Button, Card, Spinner, StatusBadge } from "@/components/ui";

export default function AppointmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const confirm = useConfirm();

  const [appointment, setAppointment] = useState<AppointmentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.booking
      .show(token)
      .then(({ appointment }) => setAppointment(appointment))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function cancel() {
    await confirm({
      title: "Cancelar cita",
      message: "¿Seguro que quieres cancelar esta cita? Esta acción no se puede deshacer.",
      confirmLabel: "Sí, cancelar",
      cancelLabel: "No, volver",
      tone: "danger",
      onConfirm: async () => {
        const { appointment } = await api.booking.cancel(token);
        setAppointment(appointment);
      },
    });
  }

  if (loading) {
    return (
      <Shell>
        <Centered>
          <Spinner /> Cargando…
        </Centered>
      </Shell>
    );
  }
  if (notFound || !appointment) {
    return (
      <Shell>
        <Centered>No encontramos esa cita.</Centered>
      </Shell>
    );
  }

  const cancelled = appointment.status === "cancelled";
  const ref = token.slice(0, 8).toUpperCase();

  return (
    <Shell>
      <main className="mx-auto max-w-xl px-5 py-12">
        <Card className="overflow-hidden">
          {/* Cabecera de estado */}
          <div className="border-b border-line px-7 py-8 text-center">
            <div
              className={
                "mx-auto grid size-14 place-items-center rounded-full " +
                (cancelled
                  ? "bg-red-100 text-red-600"
                  : "bg-success-soft text-success")
              }
            >
              {cancelled ? (
                <svg viewBox="0 0 24 24" fill="none" className="size-7" aria-hidden>
                  <path
                    d="M7 7l10 10M17 7L7 17"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="size-7" aria-hidden>
                  <path
                    d="M5 12.5l4.5 4.5L19 7"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
              {cancelled ? "Cita cancelada" : "¡Cita confirmada!"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {cancelled
                ? "Esta reserva ha sido cancelada."
                : "Tu cita ha quedado registrada correctamente."}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-1.5 text-sm">
              <span className="text-muted">Referencia</span>
              <span className="font-mono font-semibold tracking-wide text-primary">
                {ref}
              </span>
            </div>
          </div>

          {/* Cuerpo */}
          <div className="grid gap-5 p-7 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                Detalle del servicio
              </p>
              <h2 className="mt-2 text-lg font-semibold text-ink">
                {appointment.service}
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={appointment.staff} />
                <div>
                  <p className="text-sm font-medium text-ink">{appointment.staff}</p>
                  <p className="text-xs text-muted">Profesional</p>
                </div>
              </div>
              <div className="mt-4">
                <StatusBadge
                  status={appointment.status}
                  label={appointment.status_label}
                />
              </div>
            </div>

            <div className="rounded-xl bg-primary-soft/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-hover">
                Fecha y hora
              </p>
              <p className="mt-2 text-lg font-semibold capitalize text-ink">
                {appointment.date}
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {appointment.time}
              </p>
              <p className="mt-3 border-t border-primary/10 pt-3 text-sm text-muted">
                A nombre de{" "}
                <span className="font-medium text-ink">{appointment.client}</span>
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-7 py-5">
            <Link
              href="/reservar"
              className="text-sm font-semibold text-primary transition hover:text-primary-hover"
            >
              Reservar otra cita
            </Link>
            {appointment.can_cancel && (
              <Button variant="danger" onClick={cancel}>
                Cancelar cita
              </Button>
            )}
          </div>
        </Card>
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <PublicNav />
      {children}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center gap-3 px-5 text-muted">
      {children}
    </main>
  );
}
