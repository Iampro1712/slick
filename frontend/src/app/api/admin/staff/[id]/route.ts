import { NextResponse } from "next/server";

import { laravel } from "@/lib/server/laravel";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const { status, data } = await laravel(`/admin/staff/${id}`, {
    method: "PUT",
    auth: true,
    body,
  });
  return NextResponse.json(data ?? {}, { status });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;

  const { status, data } = await laravel(`/admin/staff/${id}`, {
    method: "DELETE",
    auth: true,
  });
  return NextResponse.json(data ?? {}, { status });
}
