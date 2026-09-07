import assert from "node:assert/strict";
import { existsSync, mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dbDir = mkdtempSync(join(tmpdir(), "preflight-cleanup-"));
process.env.DATABASE_PATH = join(dbDir, "preflight.db");

let scanEngine: typeof import("../src/server/scan-engine");

test.before(async () => {
  scanEngine = await import("../src/server/scan-engine");
});

const day = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-09-07T00:00:00.000Z");

function seed(id: string, status: "queued" | "running" | "completed" | "failed", createdAt: string) {
  const scan = scanEngine.createQueuedScan("https://site.test/", "https://site.test/", id, createdAt);
  if (status === "running") { scan.status = "running"; scanEngine.saveScan(scan); return; }
  if (status === "completed") { scanEngine.completeScan(scan, createdAt); scanEngine.saveScan(scan); return; }
  if (status === "failed") { scanEngine.failScan(scan, new Error("fixture"), createdAt); scanEngine.saveScan(scan); return; }
  scanEngine.saveScan(scan);
}

test("cleanup deletes only completed scans older than 30 days", () => {
  seed("old-completed", "completed", new Date(now - 40 * day).toISOString());
  seed("recent-completed", "completed", new Date(now - 2 * day).toISOString());
  seed("old-queued", "queued", new Date(now - 40 * day).toISOString());
  seed("old-running", "running", new Date(now - 40 * day).toISOString());
  seed("old-failed", "failed", new Date(now - 40 * day).toISOString());
  const result = scanEngine.cleanupOldScans({ now, maxAgeMs: 30 * day });
  assert.equal(result.deleted, 1);
  assert.equal(scanEngine.getScan("old-completed"), null);
  assert.ok(scanEngine.getScan("recent-completed"));
  assert.ok(scanEngine.getScan("old-queued"));
  assert.ok(scanEngine.getScan("old-running"));
  assert.ok(scanEngine.getScan("old-failed"));
});

test("sqlite backup writes a file outside /tmp data defaults", async () => {
  seed("backup-row", "completed", new Date(now).toISOString());
  const destination = join(dbDir, "preflight-2026-09-07.db");
  await scanEngine.backupScanDatabase(destination);
  assert.equal(existsSync(destination), true);
  assert.ok(statSync(destination).size > 0);
  await scanEngine.backupScanDatabase(destination);
  assert.ok(statSync(destination).size > 0);
});
