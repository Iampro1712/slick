import { NextResponse } from "next/server";

import { laravel, TOKEN_COOKIE } from "@/lib/server/laravel";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const { status, data } = await laravel<{ token: string; user: User }>(
    "/register",
    { method: "POST", body }
  );

  // Validación (correo duplicado, contraseña…): reenviar tal cual al navegador.
  if (status >= 400 || !data?.token) {
    return NextResponse.json(data ?? {}, { status: status || 400 });
  }

  // Éxito: guardamos el token en cookie httpOnly y devolvemos solo el usuario.
  const res = NextResponse.json({ user: data.user }, { status: 201 });
  res.cookies.set(TOKEN_COOKIE, data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días (alineado con la expiración del token Sanctum)
  });
  return res;
}
