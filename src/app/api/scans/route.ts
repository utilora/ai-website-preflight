import { NextRequest, NextResponse } from "next/server";
import { UnsafeUrlError, createScan } from "@/server/scan-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { url?: unknown };
    if (typeof body.url !== "string") return NextResponse.json({ error: "A URL is required." }, { status: 400 });
    const scan = await createScan(body.url);
    return NextResponse.json({ id: scan.id, status: scan.status }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create scan.";
    return NextResponse.json({ error: message }, { status: error instanceof UnsafeUrlError ? 400 : 500 });
  }
}
