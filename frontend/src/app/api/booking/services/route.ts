import { NextResponse } from "next/server";

import { laravel } from "@/lib/server/laravel";

export async function GET() {
  const { status, data } = await laravel("/booking/services");
  return NextResponse.json(data ?? {}, { status });
}
