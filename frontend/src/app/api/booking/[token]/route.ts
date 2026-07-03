import { NextResponse } from "next/server";

import { laravel } from "@/lib/server/laravel";

type Context = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { token } = await params;
  const { status, data } = await laravel(`/booking/${token}`);
  return NextResponse.json(data ?? {}, { status });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { token } = await params;
  const { status, data } = await laravel(`/booking/${token}`, { method: "DELETE" });
  return NextResponse.json(data ?? {}, { status });
}
