import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { clientIpFromHeaders, hostKeyFromUrl } from "@/server/rate-limit";
import { ToolUserError } from "@/server/tools/errors";
import { tryAcquireToolSlot, releaseToolSlot } from "@/server/tools/gate";
import { hostToolLimiter, ipToolLimiter } from "@/server/tools/rate-limit";
import { isToolId } from "@/server/tools/registry";
import { runTool } from "@/server/tools/runner";

function errorBody(status: number, code: string, message: string, extra?: HeadersInit) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers: extra });
}

export async function POST(request: NextRequest, context: { params: Promise<{ tool: string }> }) {
  const { tool } = await context.params;
  if (!isToolId(tool)) return errorBody(404, "failed", "Unknown tool.");
  let body: { url?: unknown };
  try {
    body = await request.json() as { url?: unknown };
  } catch {
    return errorBody(400, "invalid_url", "Enter a valid public http(s) URL.");
  }
  if (typeof body.url !== "string") return errorBody(400, "invalid_url", "Enter a valid public http(s) URL.");
  const ip = clientIpFromHeaders(request.headers);
  if (!ipToolLimiter.allow(`tool-ip:${ip}`)) {
    return errorBody(429, "rate_limited", "Too many checks. Please wait and try again.", { "Retry-After": "60" });
  }
  const host = hostKeyFromUrl(body.url);
  if (!host) return errorBody(400, "invalid_url", "Enter a valid public http(s) URL.");
  if (!hostToolLimiter.allow(`tool-host:${host}`)) {
    return errorBody(429, "rate_limited", "This website was checked recently. Please wait and try again.", { "Retry-After": "60" });
  }
  if (!tryAcquireToolSlot()) {
    return errorBody(429, "rate_limited", "Too many checks are running. Please wait and try again.", { "Retry-After": "30" });
  }
  const started = Date.now();
  try {
    const result = await runTool(tool, body.url);
    log("info", "tool.run", { tool, ok: true, durationMs: Date.now() - started });
    return NextResponse.json(result);
  } catch (error) {
    const mapped = error instanceof ToolUserError ? error : new ToolUserError("failed", "Could not complete this check.");
    log("info", "tool.run", { tool, ok: false, code: mapped.code, durationMs: Date.now() - started });
    const status = mapped.code === "invalid_url" || mapped.code === "unsafe_target" ? 400 : mapped.code === "rate_limited" ? 429 : 400;
    return errorBody(status, mapped.code, mapped.message);
  } finally {
    releaseToolSlot();
  }
}
