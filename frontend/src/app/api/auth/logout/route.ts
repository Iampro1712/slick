import { NextResponse } from "next/server";

import { laravel, TOKEN_COOKIE } from "@/lib/server/laravel";

export async function POST() {
  // Revoca el token en Laravel (si la llamada falla, igual limpiamos la cookie).
  await laravel("/logout", { method: "POST", auth: true }).catch(() => null);

  const res = NextResponse.json({ message: "Sesión cerrada." });
  res.cookies.delete(TOKEN_COOKIE);
  return res;
}
