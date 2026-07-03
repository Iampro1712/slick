"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import { Avatar, BrandMark, Button, Pill, cx } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

export type PanelNavItem = {
  href: string;
  label: string;
  icon: React.ReactNode; // contenido <path/> de un <svg viewBox="0 0 24 24">
  exact?: boolean;
};

/**
 * Chrome reutilizable del panel (sidebar + barra móvil). No hace de guard: cada
 * layout valida el rol y luego envuelve su contenido con este shell.
 */
export function PanelShell({
  title,
  subtitle,
  roleLabel,
  navItems,
  primaryAction,
  children,
}: {
  title: string;
  subtitle: string;
  roleLabel: string;
  navItems: PanelNavItem[];
  primaryAction?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();

  function isActive(item: PanelNavItem) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  async function signOut() {
    await confirm({
      title: "Cerrar sesión",
      message: "¿Seguro que quieres cerrar tu sesión?",
      confirmLabel: "Cerrar sesión",
      cancelLabel: "Cancelar",
      tone: "danger",
      onConfirm: async () => {
        await logout();
        toast("Sesión cerrada", "success");
        router.replace("/");
      },
    });
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <BrandMark className="size-9" />
          <div>
            <p className="font-semibold leading-tight tracking-tight text-ink">
              {title}
            </p>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
        </div>

        {primaryAction && (
          <div className="px-3">
            <Link
              href={primaryAction.href}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-card transition hover:bg-primary-hover"
            >
              {primaryAction.label}
            </Link>
          </div>
        )}

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                isActive(item)
                  ? "bg-primary-soft text-primary-hover"
                  : "text-muted hover:bg-surface-muted hover:text-ink"
              )}
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
                {item.icon}
              </svg>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={user?.name ?? "?"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
              <p className="text-xs text-muted">{roleLabel}</p>
            </div>
            <ThemeToggle />
          </div>
          <Button variant="secondary" size="sm" className="mt-1 w-full" onClick={signOut}>
            Salir
          </Button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="min-w-0 flex-1">
        {/* Topbar (móvil) */}
        <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="flex items-center gap-2 font-semibold tracking-tight text-ink">
              <BrandMark className="size-7" /> {title}
              <Pill tone="neutral">{roleLabel}</Pill>
            </span>
            <Button variant="secondary" size="sm" onClick={signOut}>
              Salir
            </Button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition",
                  isActive(item)
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
      </div>
    </div>
  );
}
