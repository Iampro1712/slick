import { NextResponse } from "next/server";

import { laravel } from "@/lib/server/laravel";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = Object.fromEntries(searchParams.entries());

  const { status, data } = await laravel("/booking/slots", { query });
  return NextResponse.json(data ?? {}, { status });
}
