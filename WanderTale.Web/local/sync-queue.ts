import {getDB} from "./db";

export type SyncEntityType = "trip" | "stop" | "entry" | "photo";
export type SyncOperation = "create" | "delete" | "updateCaption";
export type SyncQueueStatus = "pending" | "processing" | "synced" | "error";

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
    const timestamp = nowIso();
    const serializedPayload = JSON.stringify(payload);
    const existing = await db.getFirstAsync<{id: string}>(`
        SELECT id
        FROM sync_queue
        WHERE entity_type = ?
          AND entity_local_id = ?
          AND operation = ?
          AND status IN ('pending', 'error', 'processing')
        LIMIT 1
    `, [entityType, entityLocalId, operation]);

    if (existing) {
        await db.runAsync(`
            UPDATE sync_queue
            SET payload = ?,
                status = 'pending',
                last_error = NULL,
                updated_at = ?
            WHERE id = ?
        `, [serializedPayload, timestamp, existing.id]);
        return;
    }

    await db.runAsync(`
        INSERT INTO sync_queue (
            id, entity_type, entity_local_id, operation, payload,
            status, attempts, last_error, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'pending', 0, NULL, ?, ?)
    `, [
        createQueueId(),
        entityType,
        entityLocalId,
        operation,
        serializedPayload,
        timestamp,
        timestamp,
    ]);
}

export async function getPendingSyncQueue(limit = 25): Promise<SyncQueueItem[]> {
    const db = await getDB();

    return db.getAllAsync<SyncQueueItem>(`
        SELECT id, entity_type, entity_local_id, operation, payload, status, attempts, last_error
        FROM sync_queue
        WHERE status IN ('pending', 'error')
        ORDER BY created_at ASC
        LIMIT ?
    `, [limit]);
}

export async function markSyncQueueItemProcessing(id: string): Promise<void> {
    const db = await getDB();

    await db.runAsync(`
        UPDATE sync_queue
        SET status = 'processing',
            attempts = attempts + 1,
            updated_at = ?
        WHERE id = ?
    `, [nowIso(), id]);
}

export async function markSyncQueueItemSynced(id: string): Promise<void> {
    const db = await getDB();

    await db.runAsync(`
        UPDATE sync_queue
        SET status = 'synced',
            last_error = NULL,
            updated_at = ?
        WHERE id = ?
    `, [nowIso(), id]);
}

export async function markSyncQueueItemError(id: string, error: unknown): Promise<void> {
    const db = await getDB();
    const message = error instanceof Error ? error.message : String(error);

    await db.runAsync(`
        UPDATE sync_queue
        SET status = 'error',
            last_error = ?,
            updated_at = ?
        WHERE id = ?
    `, [message, nowIso(), id]);
}
