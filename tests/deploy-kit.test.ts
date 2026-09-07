import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("production start binds localhost and CI does not deploy", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string>; engines?: { node?: string } };
  assert.match(pkg.scripts.start, /127\.0\.0\.1/);
  assert.match(pkg.scripts.start, /--port 3000/);
  assert.match(pkg.engines?.node ?? "", /22/);

  const nginx = readFileSync("deploy/nginx-ai-website-preflight.conf", "utf8");
  assert.match(nginx, /proxy_set_header X-Forwarded-For \$remote_addr;/);
  assert.match(nginx, /proxy_set_header X-Real-IP \$remote_addr;/);
  assert.equal(nginx.includes("$proxy_add_x_forwarded_for"), false);
  assert.match(nginx, /listen 443 ssl/);

  const caddy = readFileSync("deploy/Caddyfile", "utf8");
  assert.match(caddy, /header_up X-Forwarded-For \{remote_host\}/);
  assert.match(caddy, /reverse_proxy 127\.0\.0\.1:3000/);

  const unit = readFileSync("deploy/ai-website-preflight.service", "utf8");
  assert.match(unit, /^User=preflight$/m);
  assert.match(unit, /ExecStart=\/usr\/bin\/npm run start/);
  assert.equal(unit.includes("User=root"), false);

  const backup = readFileSync("deploy/ai-website-preflight-backup.service", "utf8");
  const cleanup = readFileSync("deploy/ai-website-preflight-cleanup.service", "utf8");
  assert.match(backup, /^User=preflight$/m);
  assert.match(cleanup, /^User=preflight$/m);
  assert.match(backup, /npm run backup-scans/);
  assert.match(cleanup, /npm run cleanup-old-scans/);

  const ci = readFileSync(".github/workflows/ci.yml", "utf8");
  assert.match(ci, /npm run build/);
  assert.equal(ci.includes("systemctl"), false);
  assert.equal(ci.includes("ssh "), false);
  assert.equal(ci.includes("appleboy"), false);

  const env = readFileSync("deploy/env.production.example", "utf8");
  assert.match(env, /TRUST_PROXY_HEADERS=true/);
  assert.equal(env.includes("YOUR_DOMAIN"), true);
  assert.match(env, /MAX_ACTIVE_SCANS=1/);
});
