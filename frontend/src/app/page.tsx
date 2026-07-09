"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api } from "@/lib/client";
import type { Service } from "@/lib/types";
import { PublicNav } from "@/components/PublicNav";
import { Avatar, Card, Spinner, StatusBadge, cx } from "@/components/ui";
import { BRAND } from "@/lib/brand";

const STEPS = [
  {
    title: "Elige tu servicio",
    text: "Mira lo que ofrecemos y elige lo que necesitas.",
    icon: SparkIcon,
  },
  {
    title: "Selecciona fecha y hora",
    text: "Solo verás huecos realmente disponibles, sin sorpresas.",
    icon: CalendarIcon,
  },
  {
    title: "Confirma al instante",
    text: "Tu cita queda registrada al momento, sin esperar respuesta.",
    icon: CheckIcon,
  },
];

const BENEFITS = [
  {
    title: "Confirmación instantánea",
    text: "Tu cita queda reservada al momento; nada de esperar una llamada de vuelta.",
    icon: BoltIcon,
  },
  {
    title: "Horarios reales",
    text: "Solo ves los huecos libres de verdad; nada de reservar y que te digan que no hay.",
    icon: UserIcon,
  },
  {
    title: "Cancela cuando quieras",
    text: "Gestiona tu cita desde el enlace de confirmación, sin llamadas ni trámites.",
    icon: ShieldIcon,
  },
  {
    title: "Sin filas ni esperas",
    text: "Todo el proceso se hace en línea, a tu ritmo, desde cualquier dispositivo.",
    icon: ClockIcon,
  },
];

export default function LandingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.booking
      .services()
      .then(({ services }) => setServices(services))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <PublicNav />

      {/* Hero: composición partida (texto + mockup real del producto), no
          centrada ni con degradado de texto — evita el patrón genérico de
          "SaaS de IA". El bloque de la derecha es una vista previa ilustrativa
          del flujo de reserva, no datos reales de ningún cliente. */}
      <section className="relative overflow-hidden border-b border-line bg-surface-tint/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8">
          {/* Columna de texto */}
          <div className="text-left">
            <span className="motion-safe:animate-[fade-up_0.5s_ease-out_both] inline-flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Barbería · Solo con cita
            </span>

            <h1
              style={{ animationDelay: "80ms" }}
              className="motion-safe:animate-[fade-up_0.5s_ease-out_both] mt-5 max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl"
            >
              Reserva tu corte en {BRAND.name}.
            </h1>

            <p
              style={{ animationDelay: "160ms" }}
              className="motion-safe:animate-[fade-up_0.5s_ease-out_both] mt-5 max-w-md text-lg text-muted"
            >
              Elige el servicio y la hora que te queda en menos de un minuto.
              Tu cita queda confirmada al instante — sin llamadas, sin idas
              y vueltas.
            </p>

            <div
              style={{ animationDelay: "240ms" }}
              className="motion-safe:animate-[fade-up_0.5s_ease-out_both] mt-8 flex flex-wrap items-center gap-x-6 gap-y-3"
            >
              <Link
                href="/reservar"
                className="inline-flex items-center rounded-lg bg-primary px-6 py-3 font-semibold text-on-primary shadow-card transition hover:bg-primary-hover focus-visible:outline-none"
              >
                Reservar ahora
              </Link>
              <a
                href="#servicios"
                className="inline-flex items-center gap-1.5 font-semibold text-ink underline decoration-line underline-offset-4 transition hover:text-primary hover:decoration-primary focus-visible:outline-none"
              >
                Ver servicios
                <ArrowRightIcon className="size-4" />
              </a>
            </div>

            {/* Confianza: nada inventado, son propiedades reales del sistema. */}
            <dl
              style={{ animationDelay: "320ms" }}
              className="motion-safe:animate-[fade-up_0.5s_ease-out_both] mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6"
            >
              <div>
                <dt className="text-xs text-faint">Confirmación</dt>
                <dd className="mt-0.5 font-semibold text-ink">Al instante</dd>
              </div>
              <div>
                <dt className="text-xs text-faint">Cancelación</dt>
                <dd className="mt-0.5 font-semibold text-ink">Cuando quieras</dd>
              </div>
              <div>
                <dt className="text-xs text-faint">Costo</dt>
                <dd className="mt-0.5 font-semibold text-ink">Sin cargo</dd>
              </div>
            </dl>
          </div>

          {/* Mockup: vista previa ilustrativa del flujo de reserva */}
          <div
            style={{ animationDelay: "200ms" }}
            className="motion-safe:animate-[fade-up_0.6s_ease-out_both] relative mx-auto w-full max-w-sm lg:mx-0"
          >
            <div
              aria-hidden
              className="absolute -left-4 -top-4 h-full w-full rounded-2xl bg-primary/10"
            />
            <Card className="relative overflow-hidden p-5">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                  Vista previa
                </p>
                <StatusBadge status="confirmed" label="Confirmada" />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Avatar name="Contreras" className="size-11 text-sm" />
                <div>
                  <p className="font-semibold text-ink">Corte + barba</p>
                  <p className="text-sm text-muted">con Contreras</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-primary-soft/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-hover">
                  Hoy
                </p>
                <p className="mt-0.5 text-2xl font-bold text-primary">15:30</p>
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-faint">
                Otros horarios de hoy
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["14:00", "14:30", "15:00", "15:30", "16:00"].map((t) => (
                  <span
                    key={t}
                    className={cx(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium",
                      t === "15:30"
                        ? "border-success bg-success text-white"
                        : "border-success/40 text-success-ink"
                    )}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">
            Cómo funciona
          </h2>
          <p className="mt-2 text-muted">Tres pasos y tu cita queda lista.</p>
        </div>

        <ol className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative text-center">
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-7 hidden h-px bg-line sm:block"
                  style={{ left: "calc(50% + 28px)", width: "calc(100% - 56px)" }}
                />
              )}
              <div className="relative mx-auto grid size-14 place-items-center rounded-full bg-primary-soft text-primary-hover">
                <step.icon className="size-6" />
                <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-on-primary">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Beneficios / confianza */}
      <section className="border-y border-line bg-surface-muted/40">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink">
              Por qué reservar en línea
            </h2>
            <p className="mt-2 text-muted">
              Todo lo que necesitas, sin fricción.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <Card key={b.title} className="p-5">
                <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary-hover">
                  <b.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold text-ink">{b.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{b.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">
            Nuestros servicios
          </h2>
          <p className="mt-2 text-muted">
            {loading
              ? "Elige el que necesitas y reserva."
              : services.length > 0
                ? `${services.length} servicio${services.length === 1 ? "" : "s"} disponible${services.length === 1 ? "" : "s"} para reservar.`
                : "Elige el que necesitas y reserva."}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-muted">
            <Spinner /> Cargando servicios…
          </div>
        ) : services.length === 0 ? (
          <p className="py-10 text-center text-muted">
            Pronto publicaremos nuestros servicios.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.id}
                href="/reservar"
                aria-label={`Reservar ${s.name}`}
                className={cx(
                  "group flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-card",
                  "transition motion-safe:hover:-translate-y-0.5 hover:shadow-card-hover",
                  "motion-reduce:transition-none focus-visible:outline-none"
                )}
              >
                <div className="mb-4 grid size-11 place-items-center rounded-xl bg-primary-soft text-primary-hover">
                  <ClockIcon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold text-ink">{s.name}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">
                  {s.description ?? "Servicio disponible para reservar."}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <span className="text-sm font-medium text-muted">
                    {s.duration_min} min
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition group-hover:gap-1.5">
                    Reservar
                    <ArrowRightIcon className="size-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-hover px-8 py-14 text-center text-on-primary shadow-pop">
          <h2 className="text-3xl font-semibold tracking-tight">
            ¿Listo para agendar tu cita?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-on-primary/80">
            Reserva en línea cuando quieras. Te confirmamos al instante.
          </p>
          <Link
            href="/reservar"
            className="mt-7 inline-flex items-center rounded-lg bg-surface px-6 py-3 font-semibold text-primary transition hover:bg-surface-tint focus-visible:outline-none"
          >
            Empezar ahora
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-8 text-sm text-muted sm:flex-row sm:justify-between">
          <span>© {BRAND.year} {BRAND.name}</span>
          <Link
            href="/reservar"
            className="font-medium text-primary transition hover:text-primary-hover focus-visible:outline-none"
          >
            Reservar una cita →
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ── Iconos (SVG trazado, mismo stroke que el resto de la app) ────────────── */

function iconProps(className?: string) {
  return {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    className: className ?? "size-5",
    "aria-hidden": true as const,
  };
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path
        d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path
        d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
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

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path
        d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path
        d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 20a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path
        d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps(className)}>
      <path
        d="M4 12h16M14 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
