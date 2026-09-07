import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type ScanEventName = "fix_pack_copied";
const allowedEvents = new Set<ScanEventName>(["fix_pack_copied"]);
const dbPath = process.env.DATABASE_PATH ?? "./data/preflight.db";
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec("CREATE TABLE IF NOT EXISTS scan_events (id INTEGER PRIMARY KEY AUTOINCREMENT, scan_id TEXT NOT NULL, event_name TEXT NOT NULL, created_at TEXT NOT NULL)");

export function isScanEventName(value: unknown): value is ScanEventName { return typeof value === "string" && allowedEvents.has(value as ScanEventName); }
export function recordScanEvent(scanId: string, eventName: ScanEventName, createdAt = new Date().toISOString()) {
  db.prepare("INSERT INTO scan_events (scan_id, event_name, created_at) VALUES (?, ?, ?)").run(scanId, eventName, createdAt);
}
export function countScanEvents(scanId: string, eventName: ScanEventName) {
  const row = db.prepare("SELECT COUNT(*) AS count FROM scan_events WHERE scan_id = ? AND event_name = ?").get(scanId, eventName) as { count: number };
  return row.count;
}
