import { cleanupOldScans } from "../src/server/scan-engine";
import { log } from "../src/lib/logger";

try {
  const result = cleanupOldScans();
  log("info", "cleanup.old-scans", result);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "cleanup_failed";
  log("error", "cleanup.old-scans.failed", { message });
  process.exitCode = 1;
}
