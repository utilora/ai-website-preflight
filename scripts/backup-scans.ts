import { mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { backupScanDatabase } from "../src/server/scan-engine";
import { log } from "../src/lib/logger";

async function main() {
  const keepDays = Number(process.env.BACKUP_KEEP_DAYS ?? 14);
  const backupDir = process.env.BACKUP_DIR ?? "./data/backups";
  const stamp = new Date().toISOString().slice(0, 10);
  const destination = join(backupDir, `preflight-${stamp}.db`);
  mkdirSync(backupDir, { recursive: true });
  await backupScanDatabase(destination);
  const cutoff = Date.now() - Math.max(1, keepDays) * 24 * 60 * 60 * 1000;
  let pruned = 0;
  for (const name of readdirSync(backupDir)) {
    if (!/^preflight-\d{4}-\d{2}-\d{2}\.db$/.test(name)) continue;
    const path = join(backupDir, name);
    if (statSync(path).mtimeMs < cutoff) {
      unlinkSync(path);
      pruned += 1;
    }
  }
  log("info", "backup.scans", { destination, pruned, keepDays });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "backup_failed";
  log("error", "backup.scans.failed", { message });
  process.exitCode = 1;
});
