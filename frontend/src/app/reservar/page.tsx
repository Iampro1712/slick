"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/client";
import { ApiError } from "@/lib/errors";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import type { Service, Slot } from "@/lib/types";
import { PublicNav } from "@/components/PublicNav";
import {
  Button,
  Card,
  Field,
  Input,
  Spinner,
  Stepper,
  Textarea,
  cx,
} from "@/components/ui";

const STEPS = ["Servicio", "Fecha y hora", "Tus datos"];

function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/** Solo los dígitos del teléfono, máximo 8 (para validar y detectar completitud). */
function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

/** Formatea el teléfono como "8855-9869" mientras se escribe (guion tras 4 dígitos). */
function formatPhone(value: string): string {
  const d = phoneDigits(value);
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
}

export default function BookingWizardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const bouncedRef = useRef(false);

  // Reservar requiere sesión: si no hay usuario, al login con aviso.
  useEffect(() => {
    if (authLoading || user || bouncedRef.current) return;
    bouncedRef.current = true;
    toast("Para reservar necesitas iniciar sesión", "error");
    router.replace("/login?next=/reservar");
  }, [authLoading, user, router, toast]);

  const [step, setStep] = useState(0);

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState(todayISO());

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const slotLabel = slots.find((s) => s.value === slot)?.label ?? null;

  useEffect(() => {
    api.booking
      .services()
      .then(({ services }) => setServices(services))
      .catch(() => setError("No se pudieron cargar los servicios."))
      .finally(() => setLoadingServices(false));
  }, []);

  // Prefill con los datos del usuario logueado (sus citas quedan vinculadas
  // a su cuenta por el correo). No pisa lo que el usuario ya haya escrito.
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.name,
      email: f.email || user.email,
    }));
  }, [user]);

  useEffect(() => {
    if (!serviceId) return;
    setSlot(null);
    setLoadingSlots(true);
    api.booking
      .slots(serviceId, date, null)
      .then(({ slots }) => setSlots(slots))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [serviceId, date]);

  const canContinue = useMemo(() => {
    if (step === 0) return serviceId !== null;
    if (step === 1) return slot !== null;
    return false;
  }, [step, serviceId, slot]);

  async function submit() {
    if (!serviceId || !slot) return;
    setSubmitting(true);
    setError(null);
    try {
      const { appointment } = await api.booking.create({
        service_id: serviceId,
        staff_member_id: null,
        starts_at: slot,
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        notes: form.notes || undefined,
      });
      router.push(`/cita/${appointment.token}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "duplicate_active_booking") {
        // Ya tiene una reserva activa de este servicio.
        toast(err.message, "error");
      } else if (err instanceof ApiError && err.status === 409) {
        setError("Ese horario se acaba de ocupar. Elige otro, por favor.");
        const { slots } = await api.booking.slots(serviceId, date, null);
        setSlots(slots);
        setSlot(null);
        setStep(1);
      } else if (err instanceof ApiError && err.errors) {
        setError(Object.values(err.errors).flat()[0] ?? err.message);
      } else {
        setError("No se pudo crear la reserva. Inténtalo de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Mientras se resuelve la sesión (o si no hay), no mostramos el formulario.
  if (authLoading || !user) {
    return (
      <div className="min-h-screen">
        <PublicNav cta={false} />
        <div className="flex min-h-[60vh] items-center justify-center gap-3 text-muted">
          <Spinner /> Cargando…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PublicNav cta={false} />

      <div className="mx-auto max-w-6xl px-5 py-8">
        <Card className="mb-6 p-5">
          <Stepper steps={STEPS} current={step} />
        </Card>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              {/* Paso 1: Servicio */}
              {step === 0 && (
                <Step title="Elige un servicio">
                  {loadingServices ? (
                    <Loading>Cargando servicios…</Loading>
                  ) : services.length === 0 ? (
                    <p className="text-muted">No hay servicios disponibles.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {services.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setServiceId(s.id)}
                          className={cx(
                            "rounded-xl border p-4 text-left transition",
                            serviceId === s.id
                              ? "border-primary bg-surface-tint ring-2 ring-primary/30"
                              : "border-line bg-surface hover:border-line-strong hover:shadow-card"
                          )}
                        >
                          <div className="font-semibold text-ink">{s.name}</div>
                          {s.description && (
                            <p className="mt-1 text-sm text-muted">{s.description}</p>
                          )}
                          <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted">
                            <ClockIcon /> {s.duration_min} min
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </Step>
              )}

              {/* Paso 2: Fecha y hora */}
              {step === 1 && service && (
                <Step title="Elige fecha y hora">
                  <Field label="Fecha" htmlFor="date">
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      min={todayISO()}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-auto"
                    />
                  </Field>
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-semibold text-ink">
                      Horarios disponibles
                    </p>
                    {loadingSlots ? (
                      <Loading>Buscando horarios libres…</Loading>
                    ) : slots.length === 0 ? (
                      <p className="text-muted">
                        No hay horarios ese día. Prueba con otra fecha.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {slots.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setSlot(s.value)}
                            className={cx(
                              "rounded-lg border px-4 py-2 text-sm font-medium transition",
                              slot === s.value
                                ? "border-success bg-success text-white"
                                : "border-success/40 bg-surface text-success-ink hover:border-success hover:bg-success-soft"
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Step>
              )}

              {/* Paso 3: Datos */}
              {step === 2 && (
                <Step title="Tus datos">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submit();
                    }}
                    className="grid gap-4"
                  >
                    <Field label="Nombre completo" htmlFor="name" required>
                      <Input
                        id="name"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Tu nombre"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Teléfono"
                        htmlFor="phone"
                        required
                        hint="8 dígitos, ej. 8855-9869"
                        error={
                          form.phone && phoneDigits(form.phone).length !== 8
                            ? "El teléfono debe tener 8 dígitos."
                            : null
                        }
                      >
                        <Input
                          id="phone"
                          required
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={9}
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: formatPhone(e.target.value) })
                          }
                          placeholder="8855-9869"
                        />
                      </Field>
                      <Field
                        label="Email"
                        htmlFor="email"
                        required
                        hint="Para la confirmación."
                      >
                        <Input
                          id="email"
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="tu@email.com"
                        />
                      </Field>
                    </div>
                    <Field label="Notas" htmlFor="notes">
                      <Textarea
                        id="notes"
                        rows={2}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Opcional"
                      />
                    </Field>
                    {/* submit real lo dispara el botón del pie */}
                    <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
                  </form>
                </Step>
              )}

              {/* Navegación */}
              <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
                <Button
                  variant="ghost"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0 || submitting}
                >
                  ← Atrás
                </Button>
                {step < 2 ? (
                  <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                    Continuar
                  </Button>
                ) : (
                  <Button
                    onClick={submit}
                    disabled={
                      submitting ||
                      !form.name ||
                      phoneDigits(form.phone).length !== 8 ||
                      !form.email
                    }
                  >
                    {submitting ? "Reservando…" : "Confirmar reserva"}
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Resumen */}
          <aside className="lg:col-span-1">
            <Card className="p-6 lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                Resumen de tu reserva
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <SummaryRow label="Servicio" value={service?.name} />
                <SummaryRow
                  label="Fecha"
                  value={service ? date : null}
                />
                <SummaryRow label="Hora" value={slotLabel} />
              </dl>
              {service && (
                <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
                  <span className="text-muted">Duración</span>
                  <span className="font-semibold text-ink">
                    {service.duration_min} min
                  </span>
                </div>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-ink">{title}</h2>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={value ? "font-semibold text-ink" : "text-faint"}>
        {value ?? "Sin elegir"}
      </dd>
    </div>
  );
}

function Loading({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-muted">
      <Spinner /> {children}
    </p>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
      <path
        d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
