"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { safeNext } from "@/lib/roles";
import { Button, Card, Field, Input, Spinner } from "@/components/ui";
import { GoogleButton, OrDivider } from "@/components/GoogleButton";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    // Validación de cliente (la real la hará el backend).
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.confirm,
      });
      // Éxito: el registro ya deja la sesión iniciada. Mostramos confirmación
      // y luego llevamos al inicio (o a la página de la que venía, ?next=/...).
      const dest =
        safeNext(new URLSearchParams(window.location.search).get("next")) ?? "/";
      setDone(true);
      setTimeout(() => router.push(dest), 1200);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setError(Object.values(err.errors).flat()[0] ?? err.message);
      } else {
        setError("No se pudo crear la cuenta. Inténtalo de nuevo.");
      }
      setSubmitting(false);
    }
  }

  function continueWithGoogle() {
    // Inicia el flujo OAuth: el BFF nos lleva a Google y vuelve al callback.
    window.location.href = "/api/auth/google/start";
  }

  // Pantalla de éxito (breve) antes de redirigir al inicio ya autenticado.
  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <Card className="w-full max-w-sm p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success">
            <svg viewBox="0 0 24 24" fill="none" className="size-7" aria-hidden>
              <path
                d="M5 12.5l4.5 4.5L19 7"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
            ¡Cuenta creada{form.name ? `, ${form.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="mt-1 text-sm text-muted">
            Tu sesión ya está iniciada.
          </p>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
            <Spinner /> Llevándote al inicio…
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
        >
          <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
            <path
              d="M12 4l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Volver al inicio
        </Link>

        <Card className="w-full p-7">
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              Crear cuenta
            </h1>
            <p className="mt-1 text-sm text-muted">
              Regístrate para gestionar tus citas.
            </p>
          </div>

          <div className="mt-6">
            <GoogleButton label="Registrarse con Google" onClick={continueWithGoogle} />
          </div>

          <div className="my-5">
            <OrDivider />
          </div>

          <form onSubmit={submit} className="grid gap-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm text-muted">
                {notice}
              </div>
            )}

            <Field label="Nombre completo" htmlFor="name" required>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Tu nombre"
              />
            </Field>
            <Field label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="tu@email.com"
              />
            </Field>
            <Field
              label="Contraseña"
              htmlFor="password"
              required
              hint="Mínimo 8 caracteres."
            >
              <Input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Confirmar contraseña" htmlFor="confirm" required>
              <Input
                id="confirm"
                type="password"
                required
                value={form.confirm}
                onChange={(e) => set("confirm", e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:text-primary-hover"
            >
              Inicia sesión
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
