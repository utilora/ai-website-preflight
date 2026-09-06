import { NextResponse } from "next/server";
import { getScan } from "@/server/scan-engine";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const scan = getScan(id);
  return scan ? NextResponse.json(scan) : NextResponse.json({ error: "Scan not found." }, { status: 404 });
}
