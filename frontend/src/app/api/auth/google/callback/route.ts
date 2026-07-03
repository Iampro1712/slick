import { NextResponse } from "next/server";

import { laravel, TOKEN_COOKIE } from "@/lib/server/laravel";
import { roleHome } from "@/lib/roles";
import type { User } from "@/lib/types";

/**
 * Callback de Google: hay una sola redirect URI para dos flujos, distinguidos
 * por si el backend devuelve `token` (login/registro) o `linked` (conectar
 * desde una cuenta ya autenticada, ver /api/auth/google/link/start). Si el
 * `state` viaja (heurística para el error, ya que el backend aún no respondió)
 * asumimos que era un intento de conexión y volvemos a /cuenta.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const state = searchParams.get("state");
  const errorTarget = state ? "/cuenta?error=google_link" : "/login?error=google";

  if (oauthError || !code) {
    return NextResponse.redirect(new URL(errorTarget, request.url));
  }

  const { status, data } = await laravel<{
    token?: string;
    linked?: boolean;
    user?: User;
  }>("/auth/google/callback", { query: { code, state } });

  if (status >= 400 || !data?.user) {
    return NextResponse.redirect(new URL(errorTarget, request.url));
  }

  // Conectar cuenta: ya había sesión, no tocamos la cookie.
  if (data.linked) {
    return NextResponse.redirect(new URL("/cuenta?linked=google", request.url));
  }

  // Login/registro: guarda el token y va al panel/inicio del rol.
  const res = NextResponse.redirect(new URL(roleHome(data.user), request.url));
  if (data.token) {
    res.cookies.set(TOKEN_COOKIE, data.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });
  }
  return res;
}
