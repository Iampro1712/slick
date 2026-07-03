import { NextResponse } from "next/server";

import { laravel } from "@/lib/server/laravel";

/**
 * Inicia el flujo de "Conectar con Google" desde una cuenta ya autenticada.
 * A diferencia de /google/start, este reenvía la cookie (auth: true) para que
 * el backend sepa qué usuario está vinculando.
 */
export async function GET(request: Request) {
  const { status, data } = await laravel<{ url?: string }>(
    "/auth/google/link/redirect",
    { auth: true }
  );

  if (status >= 400 || !data?.url) {
    return NextResponse.redirect(new URL("/cuenta?error=google_link", request.url));
  }

  return NextResponse.redirect(data.url);
}
