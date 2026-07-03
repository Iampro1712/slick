import { NextResponse } from "next/server";

import { laravel } from "@/lib/server/laravel";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const { status, data } = await laravel(`/admin/appointments/${id}/status`, {
    method: "PATCH",
    auth: true,
    body,
  });
  return NextResponse.json(data ?? {}, { status });
}
