import { NextResponse } from "next/server";
import { APP_PHASE, APP_STAGE } from "@/server/stage";

export function GET() {
  return NextResponse.json({ status: "ok", service: "ai-website-preflight", phase: APP_PHASE, stage: APP_STAGE });
}
