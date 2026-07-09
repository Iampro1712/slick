import "server-only";

import { headers as nextHeaders } from "next/headers";

/**
 * Helper SERVER-ONLY para hablar con la API de Laravel.
 *
 * Vive solo en el servidor de Next (Route Handlers / Server Components). Lee la
 * `API_URL` privada y, cuando hace falta, adjunta el token Bearer leyéndolo de
 * la cookie httpOnly. El navegador nunca ejecuta este código ni ve `API_URL`.
 */

/**
 * Fuerza `https` en hosts remotos. Si `API_URL` apunta a `http://` en un host
 * que no es local, el backend redirige a `https` y `fetch` DESCARTA el header
 * `Authorization` en ese salto (lo trata como otro origen) → el backend recibe
 * la petición sin token y responde 401. Este blindaje evita que una env var mal
 * configurada (http en vez de https) rompa la autenticación en producción.
 */
function forceHttpsForRemote(raw: string): string {
  if (!raw.startsWith("http://")) return raw;
  const host = raw.slice("http://".length).split("/")[0].split(":")[0];
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  return isLocal ? raw : "https://" + raw.slice("http://".length);
}

const API_URL = forceHttpsForRemote(
  process.env.API_URL ?? "http://localhost:8000/api/v1"
);

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
    // El token Sanctum tiene formato "id|texto". Al escribir la cookie, Next
    // codifica el "|" como %7C; pero `cookies().get().value` no lo decodifica de
    // forma fiable en producción, así que Laravel recibía "10%7C..." en vez de
    // "10|..." y respondía 401. Para no depender de ese comportamiento, se lee
    // el token del header Cookie crudo y se decodifica explícitamente (seguro:
    // el token solo contiene "|" y caracteres alfanuméricos).
    const cookieHeader = incoming.get("cookie") ?? "";
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE}=([^;]+)`)
    );
    let token: string | undefined;
    if (match) {
      try {
        token = decodeURIComponent(match[1]);
      } catch {
        token = match[1];
      }
    }
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
