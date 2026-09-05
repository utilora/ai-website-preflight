import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../src/app/api/health/route";

test("health endpoint reports the Phase 01 service", async () => {
  const response = GET();
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload, { status: "ok", service: "ai-website-preflight", phase: "01" });
});
