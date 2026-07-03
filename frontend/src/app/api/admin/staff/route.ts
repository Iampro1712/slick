import { NextResponse } from "next/server";

import { laravel } from "@/lib/server/laravel";

export async function GET() {
  const { status, data } = await laravel("/admin/staff", { auth: true });
  return NextResponse.json(data ?? {}, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const { status, data } = await laravel("/admin/staff", {
    method: "POST",
    auth: true,
    body,
  });
  return NextResponse.json(data ?? {}, { status });
}
