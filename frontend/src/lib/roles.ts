import type { User } from "./types";

/**
 * Roles y rutas-home por rol.
 *
 * - admin  → panel de plataforma (/admin): gestiona cuentas de dueño y supervisa.
 * - owner  → panel del negocio (/negocio): configura servicios y profesionales.
 * - staff  → panel del negocio (/negocio): solo su agenda.
 * - client → sitio público (/).
 */
export function roleHome(user: User | null | undefined): string {
  switch (user?.role) {
    case "admin":
      return "/admin";
    case "owner":
    case "staff":
      return "/negocio";
    default:
      return "/";
  }
}

/**
 * Devuelve `next` solo si es una ruta interna segura. Rechaza URLs absolutas y
 * protocol-relative (`//evil.com`, `/\evil.com`) para evitar open redirects.
 */
export function safeNext(next: string | null | undefined): string | null {
  return next && /^\/(?![/\\])/.test(next) ? next : null;
}

export const isAdmin = (u: User | null | undefined) => u?.role === "admin";
export const isOwner = (u: User | null | undefined) => u?.role === "owner";

/** Acceso al panel del negocio (/negocio): dueño o staff. */
export const hasNegocioAccess = (u: User | null | undefined) =>
  u?.role === "owner" || u?.role === "staff";
