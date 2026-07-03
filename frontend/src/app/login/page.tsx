"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { roleHome, safeNext } from "@/lib/roles";
import { Button, Card, Field, Input } from "@/components/ui";
import { GoogleButton, OrDivider } from "@/components/GoogleButton";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Si el callback de Google falló, vuelve aquí con ?error=google.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "google") {
      setError("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const user = await login(email, password);
      // Si venía de una página protegida (?next=/...), volvemos allí.
      const next = safeNext(new URLSearchParams(window.location.search).get("next"));
      router.push(next ?? roleHome(user));
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setError(Object.values(err.errors).flat()[0] ?? err.message);
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function continueWithGoogle() {
    // Inicia el flujo OAuth: el BFF nos lleva a Google y vuelve al callback.
    window.location.href = "/api/auth/google/start";
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
              Iniciar sesión
            </h1>
            <p className="mt-1 text-sm text-muted">
              Bienvenido de nuevo. Entra a tu cuenta.
            </p>
          </div>

          <div className="mt-6">
            <GoogleButton onClick={continueWithGoogle} />
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

            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </Field>
            <Field label="Contraseña" htmlFor="password">
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setNotice("Mockup: aquí irá la recuperación de contraseña.")
                }
                className="text-sm font-medium text-primary transition hover:text-primary-hover"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Entrando…" : "Iniciar sesión"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            ¿No tienes cuenta?{" "}
            <Link
              href="/registro"
              className="font-semibold text-primary hover:text-primary-hover"
            >
              Crea una
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
