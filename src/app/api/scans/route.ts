import { NextRequest, NextResponse } from "next/server";
import { clientIpFromHeaders, hostKeyFromUrl, hostScanLimiter, ipScanLimiter } from "@/server/rate-limit";
import { UnsafeUrlError, createScan } from "@/server/scan-engine";

function tooMany(message: string) {
  return NextResponse.json({ error: message }, { status: 429, headers: { "Retry-After": "60" } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { url?: unknown };
    if (typeof body.url !== "string") return NextResponse.json({ error: "A URL is required." }, { status: 400 });
    const ip = clientIpFromHeaders(request.headers);
    if (!ipScanLimiter.allow(`ip:${ip}`)) return tooMany("Too many scan requests from this client. Please wait and try again.");
    const host = hostKeyFromUrl(body.url);
    if (!host) return NextResponse.json({ error: "Enter a valid absolute URL." }, { status: 400 });
    if (!hostScanLimiter.allow(`host:${host}`)) return tooMany("This website was scanned recently. Please wait before scanning it again.");
    const scan = await createScan(body.url);
    return NextResponse.json({ id: scan.id, status: scan.status }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create scan.";
    return NextResponse.json({ error: message }, { status: error instanceof UnsafeUrlError ? 400 : 500 });
  }
}
