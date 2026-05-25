import {CreateEntryDto} from "@/dto/createEntryDto";
import {Entry} from "@/types/entry";
import {getDB} from "./db";
import {getTripLocalId} from "./trips-repo";
import {requireCurrentOwnerEmail} from "@/local/account";

type EntryRow = {
    local_id: string;
    server_id: string | null;
    trip_local_id: string;
    title: string | null;
    content: string | null;
    entry_date: string | null;
};

type SyncStatus = "synced" | "pending" | "error";

function nowIso() {
    return new Date().toISOString();
}

function createLocalId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function entryFromRow(row: EntryRow): Entry {
    return {
        id: row.server_id ?? row.local_id,
        entryDate: row.entry_date,
        title: row.title,
        content: row.content,
    };
}

export async function getLocalEntriesByTripId(tripId: string): Promise<Entry[]> {
    const db = await getDB();
    const ownerEmail = await requireCurrentOwnerEmail();
    const rows = await db.getAllAsync<EntryRow>(`
        SELECT e.local_id, e.server_id, e.trip_local_id, e.title, e.content, e.entry_date
        FROM entries e
        INNER JOIN trips t ON t.local_id = e.trip_local_id
        WHERE e.deleted_at IS NULL
          AND t.owner_email = ?
          AND (e.trip_local_id = ? OR t.server_id = ?)
        ORDER BY e.entry_date DESC, e.created_at DESC
    `, [ownerEmail, tripId, tripId]);

    const entries = rows.map(entryFromRow);
    const seen = new Set<string>();

    return entries.filter((entry) => {
        const key = `${entry.entryDate ?? ""}|${entry.title ?? ""}|${entry.content ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export async function getEntryLocalId(id: string): Promise<string | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{local_id: string}>(`
        SELECT local_id
        FROM entries
        WHERE deleted_at IS NULL
          AND (local_id = ? OR server_id = ?)
        LIMIT 1
    `, [id, id]);

    return row?.local_id ?? null;
}

export async function getEntryServerId(localId: string): Promise<string | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{server_id: string | null}>(`
        SELECT server_id
        FROM entries
        WHERE local_id = ?
        LIMIT 1
    `, [localId]);

    return row?.server_id ?? null;
}

export async function getLocalEntryForSync(localId: string): Promise<{entry: Entry; tripLocalId: string} | null> {
    const db = await getDB();
    const ownerEmail = await requireCurrentOwnerEmail();
    const row = await db.getFirstAsync<EntryRow>(`
        SELECT e.local_id, e.server_id, e.trip_local_id, e.title, e.content, e.entry_date
        FROM entries e
        INNER JOIN trips t ON t.local_id = e.trip_local_id
        WHERE e.local_id = ?
          AND t.owner_email = ?
          AND e.deleted_at IS NULL
        LIMIT 1
    `, [localId, ownerEmail]);

    if (!row) return null;

    return {
        entry: entryFromRow(row),
        tripLocalId: row.trip_local_id,
    };
}

export async function insertLocalEntry(tripId: string, dto: CreateEntryDto): Promise<Entry> {
    const db = await getDB();
    const tripLocalId = await getTripLocalId(tripId);

    if (!tripLocalId) {
        throw new Error(`Trip not found locally: ${tripId}`);
    }

    const localId = createLocalId("entry");
    const timestamp = nowIso();

    await db.runAsync(`
        INSERT INTO entries (
            local_id, server_id, trip_local_id, title, content, entry_date,
            sync_status, created_at, updated_at, deleted_at
        )
        VALUES (?, NULL, ?, ?, ?, ?, 'pending', ?, ?, NULL)
    `, [
        localId,
        tripLocalId,
        dto.Title ?? null,
        dto.Content ?? null,
        dto.EntryDate ?? null,
        timestamp,
        timestamp,
    ]);

    return {
        id: localId,
        entryDate: dto.EntryDate ?? null,
        title: dto.Title ?? null,
        content: dto.Content ?? null,
    };
}

export async function updateLocalEntry(id: string, dto: CreateEntryDto): Promise<Entry> {
    const db = await getDB();
    const localId = await getEntryLocalId(id);

    if (!localId) {
        throw new Error(`Entry not found locally: ${id}`);
    }

    await db.runAsync(`
        UPDATE entries
        SET title = ?,
            content = ?,
            entry_date = ?,
            sync_status = 'pending',
            updated_at = ?
        WHERE local_id = ?
    `, [
        dto.Title ?? null,
        dto.Content ?? null,
        dto.EntryDate ?? null,
        nowIso(),
        localId,
    ]);

    return {
        id,
        entryDate: dto.EntryDate ?? null,
        title: dto.Title ?? null,
        content: dto.Content ?? null,
    };
}

export async function markLocalEntryDeleted(id: string): Promise<string | null> {
    const db = await getDB();
    const localId = await getEntryLocalId(id);

    if (!localId) return null;

    await db.runAsync(`
        UPDATE entries
        SET deleted_at = ?,
            sync_status = 'pending',
            updated_at = ?
        WHERE local_id = ?
    `, [nowIso(), nowIso(), localId]);

    return localId;
}

export async function hardDeleteLocalEntry(localId: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(`DELETE FROM entries WHERE local_id = ?`, [localId]);
}

export async function getSoftDeletedLocalEntryId(localId: string): Promise<string | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{local_id: string}>(`
        SELECT local_id
        FROM entries
        WHERE local_id = ?
          AND deleted_at IS NOT NULL
        LIMIT 1
    `, [localId]);

    return row?.local_id ?? null;
}

export async function markLocalEntrySynced(localId: string, serverEntry: Entry): Promise<void> {
    const db = await getDB();

    await db.runAsync(`
        UPDATE entries
        SET server_id = ?,
            title = ?,
            content = ?,
            entry_date = ?,
            sync_status = 'synced',
            updated_at = ?
        WHERE local_id = ?
          AND deleted_at IS NULL
    `, [
        serverEntry.id,
        serverEntry.title ?? null,
        serverEntry.content ?? null,
        serverEntry.entryDate ?? null,
        nowIso(),
        localId,
    ]);
}

export async function upsertEntryFromServer(tripId: string, entry: Entry): Promise<void> {
    const db = await getDB();
    const tripLocalId = await getTripLocalId(tripId);

    if (!tripLocalId) {
        throw new Error(`Trip not found locally: ${tripId}`);
    }

    const timestamp = nowIso();
    const existing = await db.getFirstAsync<{
        local_id: string;
        server_id: string | null;
        sync_status: SyncStatus;
        deleted_at: string | null;
    }>(`
        SELECT local_id, server_id, sync_status, deleted_at
        FROM entries
        WHERE server_id = ? OR local_id = ?
        LIMIT 1
    `, [entry.id, entry.id]);

    if (existing?.deleted_at) {
        return;
    }

    if (existing && (existing.sync_status === "pending" || existing.sync_status === "error")) {
        if (!existing.server_id) {
            await db.runAsync(`
                UPDATE entries
                SET server_id = ?, updated_at = ?
                WHERE local_id = ? AND server_id IS NULL
            `, [entry.id, timestamp, existing.local_id]);
        }
        return;
    }

    const localId = existing?.local_id ?? createLocalId("entry");

    await db.runAsync(`
        INSERT INTO entries (
            local_id, server_id, trip_local_id, title, content, entry_date,
            sync_status, created_at, updated_at, deleted_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'synced', ?, ?, NULL)
        ON CONFLICT(local_id) DO UPDATE SET
            server_id = excluded.server_id,
            trip_local_id = excluded.trip_local_id,
            title = excluded.title,
            content = excluded.content,
            entry_date = excluded.entry_date,
            sync_status = 'synced',
            updated_at = excluded.updated_at,
            deleted_at = NULL
    `, [
        localId,
        entry.id,
        tripLocalId,
        entry.title ?? null,
        entry.content ?? null,
        entry.entryDate ?? null,
        timestamp,
        timestamp,
    ]);
}

export async function upsertEntriesFromServer(tripId: string, entries: Entry[]): Promise<void> {
    for (const entry of entries) {
        await upsertEntryFromServer(tripId, entry);
    }
}
