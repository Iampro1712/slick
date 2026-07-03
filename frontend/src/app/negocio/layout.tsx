"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { roleHome } from "@/lib/roles";
import { Spinner } from "@/components/ui";
import { PanelShell, type PanelNavItem } from "@/components/PanelShell";

const AGENDA: PanelNavItem = {
  href: "/negocio",
  label: "Agenda",
  exact: true,
  icon: (
    <path
      d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  ),
};

const SERVICIOS: PanelNavItem = {
  href: "/negocio/servicios",
  label: "Servicios",
  icon: (
    <path
      d="M4 7h16M4 12h16M4 17h10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  ),
};

const PROFESIONALES: PanelNavItem = {
  href: "/negocio/profesionales",
  label: "Profesionales",
  icon: (
    <path
      d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 20a8 8 0 0 1 16 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  ),
};

export default function NegocioLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLogin = pathname === "/negocio/login";
  const allowed = !!user && (user.role === "owner" || user.role === "staff");

  useEffect(() => {
    if (loading || isLogin) return;
    if (!user) router.replace("/negocio/login");
    else if (!allowed) router.replace(roleHome(user)); // admin → /admin, cliente → /
  }, [loading, user, allowed, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (loading || !user || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-muted">
        <Spinner /> Cargando…
      </div>
    );
  }

  // El staff solo ve la agenda; el dueño configura todo.
  const nav =
    user.role === "owner" ? [AGENDA, SERVICIOS, PROFESIONALES] : [AGENDA];

  return (
    <PanelShell
      title="Mi negocio"
      subtitle="Slick"
      roleLabel={user.role === "owner" ? "Dueño" : "Profesional"}
      navItems={nav}
      primaryAction={{ href: "/reservar", label: "+ Nueva cita" }}
    >
      {children}
    </PanelShell>
  );
}
