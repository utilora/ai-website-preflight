import { NextResponse } from "next/server";
import { generateFixPack } from "@/server/fix-pack/generate";
import { getScan } from "@/server/scan-engine";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = getScan(id);
  if (!scan) return NextResponse.json({ error: "Scan not found." }, { status: 404 });
  if (scan.status !== "completed" || !scan.score) return NextResponse.json({ error: "A Fix Pack is available only after a scored scan completes." }, { status: 409 });

  const { markdown } = generateFixPack(scan);
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "private, no-store",
      ...(download ? { "Content-Disposition": "attachment; filename=\"PRELAUNCH_FIX.md\"" } : {}),
    },
  });
}
