"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "@/lib/client";
import { ApiError } from "@/lib/errors";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import type { AccountAppointment, AccountData } from "@/lib/types";
import { PublicNav } from "@/components/PublicNav";
import { GoogleButton } from "@/components/GoogleButton";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Pill,
  Spinner,
  StatusBadge,
} from "@/components/ui";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const toast = useToast();

  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Edición de información personal.
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Guard: sin sesión → al login.
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // Vuelta del flujo "Conectar con Google" (ver GoogleButton más abajo).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("linked") === "google") {
      toast("Cuenta de Google conectada", "success");
      refresh();
      router.replace("/cuenta");
    } else if (params.get("error") === "google_link") {
      toast("No se pudo conectar tu cuenta de Google", "error");
      router.replace("/cuenta");
    }
    // Solo al montar: es la respuesta a la redirección del callback OAuth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api.account
      .get()
      .then((d) => {
        setData(d);
        setForm({ name: d.user.name, email: d.user.email });
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await api.account.update({ name: form.name.trim(), email: form.email.trim() });
      await refresh(); // refleja el nuevo nombre en el navbar
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setSaveError(Object.values(err.errors).flat()[0] ?? err.message);
      } else {
        setSaveError("No se pudo guardar. Inténtalo de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return (
      <Shell>
        <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted">
          <Spinner /> Cargando…
        </div>
      </Shell>
    );
  }

  const upcoming = data?.appointments.filter((a) => !a.is_past) ?? [];
  const past = data?.appointments.filter((a) => a.is_past) ?? [];

  // Estado fresco de Google: prioriza /api/account (recargado en cada visita)
  // sobre el usuario de sesión, que puede estar desactualizado.
  const googleConnected = data?.user.google_connected ?? user.google_connected;

  return (
    <Shell>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <header className="mb-8 flex items-center gap-4">
          <Avatar name={user.name} className="size-14 text-lg" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {user.name}
            </h1>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </header>

        {/* Información personal */}
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight text-ink">
            Información personal
          </h2>
          <Card className="p-6">
            <form onSubmit={save} className="grid gap-4">
              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}
              {saved && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Información actualizada.
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre" htmlFor="name" required>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Correo" htmlFor="email" required>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando…" : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </Card>
        </section>

        {/* Seguridad / inicio de sesión */}
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight text-ink">
            Seguridad
          </h2>
          <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="font-medium text-ink">Google</p>
              <p className="mt-0.5 text-sm text-muted">
                {googleConnected
                  ? "Puedes iniciar sesión con tu cuenta de Google."
                  : "Conecta tu cuenta para iniciar sesión con un clic."}
              </p>
            </div>
            {googleConnected ? (
              <Pill tone="success">Conectada</Pill>
            ) : (
              <div className="w-full sm:w-auto">
                <GoogleButton
                  label="Conectar con Google"
                  onClick={() => {
                    window.location.href = "/api/auth/google/link/start";
                  }}
                />
              </div>
            )}
          </Card>
        </section>

        {/* Reservas */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Mis reservas
            </h2>
            <Link
              href="/reservar"
              className="text-sm font-semibold text-primary transition hover:text-primary-hover"
            >
              + Nueva reserva
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-muted">
              <Spinner /> Cargando reservas…
            </div>
          ) : loadError ? (
            <EmptyState>
              <p>No se pudieron cargar tus reservas.</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
                Reintentar
              </Button>
            </EmptyState>
          ) : (data?.appointments.length ?? 0) === 0 ? (
            <EmptyState>
              <p>Aún no tienes reservas.</p>
              <Link
                href="/reservar"
                className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
              >
                Reservar una cita
              </Link>
            </EmptyState>
          ) : (
            <div className="space-y-6">
              {upcoming.length > 0 && (
                <AppointmentGroup title="Próximas" items={upcoming} />
              )}
              {past.length > 0 && (
                <AppointmentGroup title="Anteriores" items={past} muted />
              )}
            </div>
          )}
        </section>
      </main>
    </Shell>
  );
}

function AppointmentGroup({
  title,
  items,
  muted,
}: {
  title: string;
  items: AccountAppointment[];
  muted?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
        {title}
      </p>
      <Card className="divide-y divide-line overflow-hidden">
        {items.map((a) => (
          <Link
            key={a.token}
            href={`/cita/${a.token}`}
            className={`flex items-center justify-between gap-4 p-4 transition hover:bg-surface-muted/60 sm:px-5 ${
              muted ? "opacity-80" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="font-semibold text-ink">{a.service}</p>
              <p className="mt-0.5 truncate text-sm text-muted">
                <span className="capitalize">{a.date}</span> · {a.time} · {a.staff}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StatusBadge status={a.status} label={a.status_label} />
              <svg viewBox="0 0 20 20" fill="none" className="size-4 text-faint" aria-hidden>
                <path
                  d="M8 4l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <PublicNav cta={false} />
      {children}
    </div>
  );
}
