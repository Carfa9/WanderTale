import {getDB} from "./db";
import {requireCurrentOwnerEmail} from "@/local/account";

export type SyncEntityType = "trip" | "stop" | "entry" | "photo";
export type SyncOperation = "create" | "update" | "delete" | "updateCaption";
export type SyncQueueStatus = "pending" | "processing" | "synced" | "error" | "failed";

export type SyncQueueItem = {
    id: string;
    entity_type: SyncEntityType;
    entity_local_id: string;
    operation: SyncOperation;
    payload: string;
    status: SyncQueueStatus;
    attempts: number;
    last_error: string | null;
};

function nowIso() {
    return new Date().toISOString();
}

function createQueueId() {
    return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueSyncOperation(
    entityType: SyncEntityType,
    entityLocalId: string,
    operation: SyncOperation,
    payload: unknown
): Promise<void> {
    const db = await getDB();
    const ownerEmail = await requireCurrentOwnerEmail();
    const timestamp = nowIso();
    const serializedPayload = JSON.stringify(payload);
    const existing = await db.getFirstAsync<{ id: string }>(`
        SELECT id
        FROM sync_queue
        WHERE entity_type = ?
          AND entity_local_id = ?
          AND operation = ?
          AND owner_email = ?
          AND status IN ('pending', 'error', 'processing')
        LIMIT 1
    `, [entityType, entityLocalId, operation, ownerEmail]);

    if (existing) {
        await db.runAsync(`
            UPDATE sync_queue
            SET payload    = ?,
                status     = 'pending',
                last_error = NULL,
                updated_at = ?
            WHERE id = ?
        `, [serializedPayload, timestamp, existing.id]);
        return;
    }

    await db.runAsync(`
        INSERT INTO sync_queue (id, entity_type, entity_local_id, operation, payload,
                                status, attempts, last_error, created_at, updated_at, owner_email)
        VALUES (?, ?, ?, ?, ?, 'pending', 0, NULL, ?, ?, ?)
    `, [
        createQueueId(),
        entityType,
        entityLocalId,
        operation,
        serializedPayload,
        timestamp,
        timestamp,
        ownerEmail,
    ]);
}

export async function getPendingSyncQueue(limit = 25): Promise<SyncQueueItem[]> {
    const db = await getDB();
    const ownerEmail = await requireCurrentOwnerEmail();
    const timestamp = nowIso();

    const staleProcessingBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    await db.runAsync(`
          UPDATE sync_queue
          SET status = 'pending',
              locked_at = NULL,
              updated_at = ?
          WHERE owner_email = ?
            AND status = 'processing'
            AND locked_at IS NOT NULL
            AND locked_at < ?
      `, [timestamp, ownerEmail, staleProcessingBefore]);

    return db.getAllAsync<SyncQueueItem>(`
        SELECT id,
               entity_type,
               entity_local_id,
               operation,
               payload,
               status,
               attempts,
               last_error
        FROM sync_queue
        WHERE owner_email = ?
          AND status IN ('pending', 'error')
          AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
        ORDER BY created_at ASC
        LIMIT ?
    `, [ownerEmail, timestamp, limit]);
}

export async function markSyncQueueItemProcessing(id: string): Promise<void> {
    const db = await getDB();
    const timestamp = nowIso();

    await db.runAsync(`
        UPDATE sync_queue
        SET status     = 'processing',
            attempts   = attempts + 1,
            locked_at  = ?,
            updated_at = ?
        WHERE id = ?
    `, [timestamp, timestamp, id]);
}

export async function markSyncQueueItemSynced(id: string): Promise<void> {
    const db = await getDB();
    const timestamp = nowIso();

    await db.runAsync(`
        UPDATE sync_queue
        SET status     = 'synced',
            locked_at = NULL,
            last_error = NULL,
            updated_at = ?
        WHERE id = ?
    `, [timestamp, id]);
}

export async function markSyncQueueItemError(id: string, error: unknown): Promise<void> {
    const db = await getDB();
    const message = error instanceof Error ? error.message : String(error);

    await db.runAsync(`
        UPDATE sync_queue
        SET status     = 'error',
            locked_at = NULL,
            last_error = ?,
            updated_at = ?
        WHERE id = ?
    `, [message, nowIso(), id]);
}

export async function markSyncQueueItemFailed(id: string, error: unknown): Promise<void> {
    const db = await getDB();
    const message = error instanceof Error ? error.message : String(error);
    const timestamp = nowIso();
    
    await db.runAsync(`
        UPDATE sync_queue
        SET status = 'failed',
            locked_at = NULL,
            last_error = ?,
            updated_at = ?
        WHERE id = ?        
    `, [message, timestamp, id]);
}
