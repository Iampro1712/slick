import { NextResponse } from "next/server";

import { laravel } from "@/lib/server/laravel";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  // Crear reserva requiere sesión: reenviamos el token de la cookie httpOnly.
  const { status, data } = await laravel("/booking", {
    method: "POST",
    auth: true,
    body,
  });
  return NextResponse.json(data ?? {}, { status });
}
