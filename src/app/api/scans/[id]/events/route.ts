import { NextResponse } from "next/server";
import { getScan } from "@/server/scan-engine";
import { isScanEventName, recordScanEvent } from "@/server/scan-events";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = getScan(id);
  if (!scan) return NextResponse.json({ error: "Scan not found." }, { status: 404 });
  if (scan.status !== "completed" || !scan.score) return NextResponse.json({ error: "Copy events are available only for completed Fix Packs." }, { status: 409 });
  const body = await request.json().catch(() => null) as { event?: unknown } | null;
  if (!isScanEventName(body?.event)) return NextResponse.json({ error: "Unsupported scan event." }, { status: 400 });
  recordScanEvent(id, body.event);
  return new NextResponse(null, { status: 204 });
}
