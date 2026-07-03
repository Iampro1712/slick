import "server-only";

import { cookies, headers as nextHeaders } from "next/headers";

/**
 * Helper SERVER-ONLY para hablar con la API de Laravel.
 *
 * Vive solo en el servidor de Next (Route Handlers / Server Components). Lee la
 * `API_URL` privada y, cuando hace falta, adjunta el token Bearer leyéndolo de
 * la cookie httpOnly. El navegador nunca ejecuta este código ni ve `API_URL`.
 */

const API_URL = process.env.API_URL ?? "http://localhost:8000/api/v1";

/** Nombre de la cookie httpOnly que guarda el token Sanctum. */
export const TOKEN_COOKIE = "agenda_token";

type LaravelOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | null | undefined>;
};

export type LaravelResult<T = unknown> = {
  status: number;
  data: T;
};

export async function laravel<T = unknown>(
  path: string,
  options: LaravelOptions = {}
): Promise<LaravelResult<T>> {
  const { method = "GET", body, auth = false, query } = options;

  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // Reenvía la IP real del cliente para que el rate limiting del backend sea
  // por usuario y no por la IP del servidor de Next (patrón BFF).
  const incoming = await nextHeaders();
  const clientIp =
    incoming.get("x-forwarded-for")?.split(",")[0].trim() ||
    incoming.get("x-real-ip") ||
    "";
  if (clientIp) {
    headers["X-Client-IP"] = clientIp;
    // El secreto compartido autentica que la IP la reenvía el BFF, no un atacante.
    if (process.env.BFF_SECRET) headers["X-Bff-Secret"] = process.env.BFF_SECRET;
  }

  if (auth) {
    const token = (await cookies()).get(TOKEN_COOKIE)?.value;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data =
    res.status === 204 ? null : await res.json().catch(() => null);

  return { status: res.status, data: data as T };
}
