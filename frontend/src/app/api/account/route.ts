import { NextResponse } from "next/server";

import { laravel } from "@/lib/server/laravel";

export async function GET() {
  const { status, data } = await laravel("/account", { auth: true });
  return NextResponse.json(data ?? {}, { status });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));

  const { status, data } = await laravel("/account", {
    method: "PUT",
    auth: true,
    body,
  });
  return NextResponse.json(data ?? {}, { status });
}
