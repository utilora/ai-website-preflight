export type ScanRecord = { id: string; url: string; createdAt: string; status: "queued" | "complete" | "failed" };

export interface ScanRepository {
  create(record: ScanRecord): Promise<void>;
  findById(id: string): Promise<ScanRecord | null>;
}

/**
 * Phase 01 SQLite boundary. A concrete SQLite adapter and schema migration
 * are intentionally deferred until the scanning workflow exists.
 */
export function createScanRepository(): ScanRepository {
  return {
    async create() { throw new Error("SQLite persistence is not enabled in Phase 01."); },
    async findById() { return null; },
  };
}
