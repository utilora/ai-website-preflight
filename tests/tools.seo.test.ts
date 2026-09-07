import assert from "node:assert/strict";
import test from "node:test";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import { TOOLS, getTool } from "../src/server/tools/registry";
import { toolPageMetadata } from "../src/server/tools/page-metadata";
import { TOOL_IDS } from "../src/server/tools/types";

test("each tool has unique title, description, canonical, and H1", () => {
  const titles = TOOLS.map((tool) => tool.title);
  const descriptions = TOOLS.map((tool) => tool.description);
  const h1s = TOOLS.map((tool) => tool.h1);
  assert.equal(new Set(titles).size, 7);
  assert.equal(new Set(descriptions).size, 7);
  assert.equal(new Set(h1s).size, 7);
  for (const id of TOOL_IDS) {
    const meta = toolPageMetadata(id);
    const tool = getTool(id);
    assert.equal(meta.title, tool.title);
    assert.equal(meta.description, tool.description);
    assert.equal((meta.alternates as { canonical?: string }).canonical, `http://localhost:3000/tools/${id}`);
    assert.equal((meta.robots as { index?: boolean }).index, true);
    assert.equal(tool.related.length, 3);
    assert.ok(!tool.related.includes(id));
  }
});

test("project sitemap includes home, hub, and tools but not scan reports", () => {
  const urls = sitemap().map((entry) => entry.url);
  assert.ok(urls.includes("http://localhost:3000/"));
  assert.ok(urls.includes("http://localhost:3000/tools"));
  for (const id of TOOL_IDS) assert.ok(urls.includes(`http://localhost:3000/tools/${id}`));
  assert.equal(urls.some((url) => url.includes("/scan/")), false);
  assert.equal(urls.some((url) => url.includes("/api/")), false);
  assert.equal(urls.length, 9);
});

test("site robots allow public pages and do not disallow /", () => {
  const value = robots();
  const rules = Array.isArray(value.rules) ? value.rules[0] : value.rules;
  assert.equal(rules.userAgent, "*");
  assert.equal(rules.allow, "/");
  assert.ok(rules.disallow?.includes("/scan/"));
  assert.ok(rules.disallow?.includes("/api/"));
  assert.equal(value.sitemap, "http://localhost:3000/sitemap.xml");
});
