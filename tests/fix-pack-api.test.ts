import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/scans/[id]/fix-pack/route";
import { POST } from "../src/app/api/scans/[id]/events/route";
import { calculateScore } from "../src/server/scoring";
import { countScanEvents } from "../src/server/scan-events";
import { createQueuedScan, saveScan } from "../src/server/scan-engine";
import type { Finding } from "../src/server/rules";

const params = (id: string) => ({ params: Promise.resolve({ id }) });

test("Fix Pack API returns 404 for an unknown scan", async () => {
  const response = await GET(new Request("http://localhost/api/scans/phase05-unknown/fix-pack"), params("phase05-unknown"));
  assert.equal(response.status, 404);
});

test("Fix Pack API rejects queued, running, and failed scans with 409", async () => {
  for (const status of ["queued", "running", "failed"] as const) {
    const id = `phase05-api-${status}`;
    const scan = createQueuedScan("https://site.test", "https://site.test/", id, "2026-09-07T00:00:00.000Z");
    scan.status = status; saveScan(scan);
    const response = await GET(new Request(`http://localhost/api/scans/${id}/fix-pack`), params(id));
    assert.equal(response.status, 409, status);
  }
});

test("completed Fix Pack API returns UTF-8 Markdown and a safe download filename", async () => {
  const id = "phase05-api-completed";
  const scan = createQueuedScan("https://site.test", "https://site.test/", id, "2026-09-07T00:00:00.000Z");
  const finding: Finding = { ruleId: "title.missing", severity: "high", title: "Page title is missing", message: "No title.", evidence: "No title extracted.", affectedUrl: "https://site.test/" };
  scan.status = "completed"; scan.findings = [finding]; scan.score = calculateScore(scan.findings); saveScan(scan);

  const inline = await GET(new Request(`http://localhost/api/scans/${id}/fix-pack`), params(id));
  assert.equal(inline.status, 200);
  assert.equal(inline.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.equal(inline.headers.get("content-disposition"), null);
  assert.ok((await inline.text()).includes("title.missing"));

  const download = await GET(new Request(`http://localhost/api/scans/${id}/fix-pack?download=1`), params(id));
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("content-disposition"), 'attachment; filename="PRELAUNCH_FIX.md"');
});

test("copy event API records only the allowlisted event for an existing scan", async () => {
  const id = "phase05-api-copy-event";
  const scan = createQueuedScan("https://site.test", "https://site.test/", id, "2026-09-07T00:00:00.000Z");
  scan.status = "completed"; scan.score = calculateScore([]);
  saveScan(scan);
  const before = countScanEvents(id, "fix_pack_copied");
  const response = await POST(new Request(`http://localhost/api/scans/${id}/events`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "fix_pack_copied" }) }), params(id));
  assert.equal(response.status, 204);
  assert.equal(countScanEvents(id, "fix_pack_copied"), before + 1);

  const invalid = await POST(new Request(`http://localhost/api/scans/${id}/events`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "arbitrary_event" }) }), params(id));
  assert.equal(invalid.status, 400);
  const unknown = await POST(new Request("http://localhost/api/scans/phase05-event-unknown/events", { method: "POST", body: "{}" }), params("phase05-event-unknown"));
  assert.equal(unknown.status, 404);
});
