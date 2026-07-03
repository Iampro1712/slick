"use client";

import { useState } from "react";
import Link from "next/link";

import { useAuth } from "@/lib/auth";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import { Avatar, BrandMark, Button, cx } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Barra superior de las pantallas públicas (landing, reserva, confirmación).
 * Fija arriba (sticky) y responsive: en desktop muestra los enlaces en línea;
 * en móvil se colapsan en un menú hamburguesa para no desbordar. Refleja la
 * sesión: con usuario muestra su nombre y "Salir"; sin usuario, acceso/registro.
 */
export function PublicNav({ cta = true }: { cta?: boolean }) {
  const { user, loading, logout } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const firstName = user?.name.split(" ")[0] ?? "";

  async function handleLogout() {
    setOpen(false);
    await confirm({
      title: "Cerrar sesión",
      message: "¿Seguro que quieres cerrar tu sesión?",
      confirmLabel: "Cerrar sesión",
      cancelLabel: "Cancelar",
      tone: "danger",
      onConfirm: async () => {
        await logout();
        toast("Sesión cerrada", "success");
      },
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <BrandMark className="size-8" />
          <span className="text-base font-semibold tracking-tight text-ink sm:text-lg">
            Slick
          </span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 text-sm font-medium sm:flex">
          <NavLink href="/reservar">Reservar</NavLink>
          <ThemeToggle className="ml-1" />

          {loading ? null : user ? (
            <div className="ml-1 flex items-center gap-2">
              <Link
                href="/cuenta"
                className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-surface-muted"
              >
                <Avatar name={user.name} className="size-7 text-xs" />
                <span className="font-medium text-ink">{firstName}</span>
              </Link>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Salir
              </Button>
            </div>
          ) : (
            <>
              <NavLink href="/login">Iniciar sesión</NavLink>
              <Cta href={cta ? "/registro" : "/login"}>
                {cta ? "Crear cuenta" : "Iniciar sesión"}
              </Cta>
            </>
          )}
        </nav>

        {/* Móvil */}
        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            className="grid size-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-surface-muted hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
              {open ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Panel desplegable (móvil) */}
      {open && (
        <nav className="border-t border-line bg-surface px-4 py-3 sm:hidden">
          <div className="grid gap-1">
            {user && (
              <Link
                href="/cuenta"
                onClick={() => setOpen(false)}
                className="mb-1 flex items-center gap-3 rounded-lg bg-surface-muted px-3 py-2.5 transition hover:bg-surface-tint"
              >
                <Avatar name={user.name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                  <p className="truncate text-xs text-muted">Ver mi cuenta</p>
                </div>
              </Link>
            )}

            <MobileLink href="/reservar" onClick={() => setOpen(false)}>
              Reservar
            </MobileLink>
            {user && (
              <MobileLink href="/cuenta" onClick={() => setOpen(false)}>
                Mi cuenta
              </MobileLink>
            )}

            {!loading && !user && (
              <>
                <MobileLink href="/login" onClick={() => setOpen(false)}>
                  Iniciar sesión
                </MobileLink>
                <MobileLink href="/registro" onClick={() => setOpen(false)}>
                  Crear cuenta
                </MobileLink>
              </>
            )}

            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Salir
              </button>
            ) : (
              <Link
                href="/reservar"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 font-semibold text-on-primary shadow-card transition hover:bg-primary-hover"
              >
                Reservar ahora
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-muted transition hover:bg-surface-muted hover:text-ink"
    >
      {children}
    </Link>
  );
}

function Cta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="ml-1 inline-flex shrink-0 items-center rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary shadow-card transition hover:bg-primary-hover"
    >
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cx(
        "rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-muted"
      )}
    >
      {children}
    </Link>
  );
}
