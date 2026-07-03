import { NextResponse } from "next/server";

import { laravel } from "@/lib/server/laravel";

/**
 * Inicia el flujo de Google: pide al backend la URL de consentimiento y manda
 * el navegador allí.
 */
export async function GET(request: Request) {
  const { status, data } = await laravel<{ url?: string }>("/auth/google/redirect");

  if (status >= 400 || !data?.url) {
    return NextResponse.redirect(new URL("/login?error=google", request.url));
  }

  return NextResponse.redirect(data.url);
}
