import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../src/app/api/health/route";
import { APP_PHASE, APP_STAGE } from "../src/server/stage";

test("health endpoint reports the current service stage", async () => {
  const response = GET();
  assert.equal(response.status, 200);
  const payload = await response.json() as Record<string, unknown>;
  assert.deepEqual(payload, { status: "ok", service: "ai-website-preflight", phase: APP_PHASE, stage: APP_STAGE });
  assert.equal(payload.phase, "07");
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("database"), false);
  assert.equal(serialized.includes("/var/"), false);
  assert.equal(serialized.includes("preflight.db"), false);
});
