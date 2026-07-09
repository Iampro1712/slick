import { NextResponse } from "next/server";

import { laravel } from "@/lib/server/laravel";

type Context = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { token } = await params;
  // auth: reenvía el token de sesión; el backend exige ser dueño de la cita.
  const { status, data } = await laravel(`/booking/${token}`, { auth: true });
  return NextResponse.json(data ?? {}, { status });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { token } = await params;
  const { status, data } = await laravel(`/booking/${token}`, {
    method: "DELETE",
    auth: true,
  });
  return NextResponse.json(data ?? {}, { status });
}
