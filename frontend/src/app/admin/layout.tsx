"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { roleHome } from "@/lib/roles";
import { Spinner } from "@/components/ui";
import { PanelShell, type PanelNavItem } from "@/components/PanelShell";

const NAV: PanelNavItem[] = [
  {
    href: "/admin",
    label: "Cuentas",
    exact: true,
    icon: (
      <path
        d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 20a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    ),
  },
  {
    href: "/admin/agenda",
    label: "Agenda",
    icon: (
      <path
        d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    ),
  },
  {
    href: "/admin/servicios",
    label: "Servicios",
    icon: (
      <path
        d="M4 7h16M4 12h16M4 17h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    ),
  },
  {
    href: "/admin/profesionales",
    label: "Profesionales",
    icon: (
      <path
        d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 20a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLogin = pathname === "/admin/login";
  const allowed = !!user && user.role === "admin";

  useEffect(() => {
    if (loading || isLogin) return;
    if (!user) router.replace("/admin/login");
    else if (!allowed) router.replace(roleHome(user));
  }, [loading, user, allowed, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (loading || !user || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-muted">
        <Spinner /> Cargando…
      </div>
    );
  }

  return (
    <PanelShell
      title="Plataforma"
      subtitle="Slick"
      roleLabel="Admin"
      navItems={NAV}
    >
      {children}
    </PanelShell>
  );
}
