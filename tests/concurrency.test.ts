import assert from "node:assert/strict";
import test from "node:test";
import { createQueuedScan, enqueueScan, getScanRuntimeSnapshot, resetScanRuntime, saveScan, configureScanRuntime } from "../src/server/scan-engine";

async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

test.beforeEach(() => { resetScanRuntime(); });
test.afterEach(() => { resetScanRuntime(); });

test("active scans never exceed the configured cap while extras stay queued", async () => {
  const releases = new Map<string, () => void>();
  configureScanRuntime({
    maxActiveScans: 1,
    runner: (id) => new Promise<void>((resolve) => { releases.set(id, resolve); }),
  });
  saveScan(createQueuedScan("https://site.test", "https://site.test/", "queue-a"));
  saveScan(createQueuedScan("https://site.test", "https://site.test/", "queue-b"));
  enqueueScan("queue-a");
  enqueueScan("queue-b");
  await flush();
  const busy = getScanRuntimeSnapshot();
  assert.equal(busy.active, 1);
  assert.equal(busy.queued, 1);
  assert.ok(releases.has("queue-a"));
  assert.equal(releases.has("queue-b"), false);
  releases.get("queue-a")!();
  await flush();
  const next = getScanRuntimeSnapshot();
  assert.equal(next.active, 1);
  assert.equal(next.queued, 0);
  assert.ok(releases.has("queue-b"));
  releases.get("queue-b")!();
  await flush();
  assert.deepEqual(getScanRuntimeSnapshot(), { active: 0, queued: 0, maxActive: 1 });
});

test("a failed scan releases its slot so the next queued scan can run", async () => {
  const releases: Array<() => void> = [];
  let started = 0;
  configureScanRuntime({
    maxActiveScans: 1,
    runner: async (id) => {
      started += 1;
      if (id === "fail-a") throw new Error("scan exploded");
      await new Promise<void>((resolve) => releases.push(resolve));
    },
  });
  saveScan(createQueuedScan("https://site.test", "https://site.test/", "fail-a"));
  saveScan(createQueuedScan("https://site.test", "https://site.test/", "fail-b"));
  enqueueScan("fail-a");
  enqueueScan("fail-b");
  await flush();
  assert.equal(started, 2);
  assert.equal(getScanRuntimeSnapshot().active, 1);
  assert.equal(getScanRuntimeSnapshot().queued, 0);
  releases[0]!();
  await flush();
  assert.equal(getScanRuntimeSnapshot().active, 0);
});
