import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createSafeFetcher, requestPinned, type Resolver, type Transport } from "../src/server/scan-engine";
import { ToolUserError } from "../src/server/tools/errors";
import { toolScanLimits } from "../src/server/tools/limits";
import { runTool } from "../src/server/tools/runner";
import { analyzeSitemap } from "../src/server/tools/sitemap";

test("tool runner blocks localhost and private IPs before fetch", async () => {
  await assert.rejects(() => runTool("sitemap-checker", "http://localhost/"), (error: unknown) => error instanceof ToolUserError && (error.code === "invalid_url" || error.code === "unsafe_target"));
  await assert.rejects(() => runTool("meta-tag-checker", "http://127.0.0.1/"), (error: unknown) => error instanceof ToolUserError && error.code === "unsafe_target");
  await assert.rejects(() => runTool("robots-txt-checker", "not-a-url"), (error: unknown) => error instanceof ToolUserError && error.code === "invalid_url");
});

test("tool analyzers reuse pinned-IP fetch and block private redirects", async () => {
  const server = http.createServer((_request, response) => {
    response.writeHead(302, { location: "http://127.0.0.1/private" }).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("mock server failed");
  const origin = `http://safe.test:${address.port}`;
  const resolver: Resolver = async (hostname) => hostname === "127.0.0.1" ? [{ address: "127.0.0.1", family: 4 }] : [{ address: "93.184.216.34", family: 4 }];
  const transport: Transport = (url, _address, maxBytes, activeLimits) => requestPinned(url, { address: "127.0.0.1", family: 4 }, maxBytes, activeLimits);
  const fetcher = createSafeFetcher({ resolver, transport, limits: toolScanLimits });
  const result = await analyzeSitemap(new URL(`${origin}/`), fetcher);
  assert.equal(result.issue?.code, "unsafe_target");
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
