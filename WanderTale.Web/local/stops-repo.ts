import {CreateStopDto, Stop} from "@/types/stop";
import {TravelModeKey} from "@/types/travelMode";
import {getDB} from "./db";
import {getTripLocalId} from "./trips-repo";

type SyncStatus = "synced" | "pending" | "error";

type StopRow = {
    local_id: string;
    server_id: string | null;
    trip_local_id: string;
    trip_server_id: string | null;
    title: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    country: string | null;
    order_index: number;
    created_at: string;
    updated_at: string;
};

type TravelModeRow = {
    mode: TravelModeKey;
};

function nowIso() {
    return new Date().toISOString();
}

function createLocalId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function stopFromRow(row: StopRow, travelModes: TravelModeKey[]): Stop {
    return {
        id: row.server_id ?? row.local_id,
        clientId: row.local_id,
        tripId: row.trip_server_id ?? row.trip_local_id,
        title: row.title,
        description: row.description,
        startDate: row.start_date,
        endDate: row.end_date,
        country: row.country,
        orderIndex: row.order_index,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        travelModes,
    };
}

async function getNextOrderIndex(tripLocalId: string): Promise<number> {
    const db = await getDB();
    const row = await db.getFirstAsync<{next_order_index: number | null}>(`
        SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order_index
        FROM stops
        WHERE trip_local_id = ?
          AND deleted_at IS NULL
    `, [tripLocalId]);

    return row?.next_order_index ?? 1;
}

export async function getLocalStopsByTripId(tripId: string): Promise<Stop[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<StopRow>(`
        SELECT
            s.local_id,
            s.server_id,
            s.trip_local_id,
            t.server_id AS trip_server_id,
            s.title,
            s.description,
            s.start_date,
            s.end_date,
            s.country,
            s.order_index,
            s.created_at,
            s.updated_at
        FROM stops s
        INNER JOIN trips t ON t.local_id = s.trip_local_id
        WHERE s.deleted_at IS NULL
          AND (s.trip_local_id = ? OR t.server_id = ?)
        ORDER BY s.order_index ASC, s.created_at ASC
    `, [tripId, tripId]);

    return Promise.all(
        rows.map(async row =>
            stopFromRow(row, await getLocalStopTravelModes(row.local_id))
        )
    );
}

export async function getLocalStopForSync(localId: string): Promise<{stop: Stop; tripLocalId: string} | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<StopRow>(`
        SELECT
            s.local_id,
            s.server_id,
            s.trip_local_id,
            t.server_id AS trip_server_id,
            s.title,
            s.description,
            s.start_date,
            s.end_date,
            s.country,
            s.order_index,
            s.created_at,
            s.updated_at
        FROM stops s
        INNER JOIN trips t ON t.local_id = s.trip_local_id
        WHERE s.local_id = ?
          AND s.deleted_at IS NULL
        LIMIT 1
    `, [localId]);

    if (!row) return null;

    return {
        stop: stopFromRow(row, await getLocalStopTravelModes(row.local_id)),
        tripLocalId: row.trip_local_id,
    };
}

export async function getStopServerId(localId: string): Promise<string | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{server_id: string | null}>(
        `
        SELECT server_id
        FROM stops
        WHERE local_id = ?
        LIMIT 1
    `,
        [localId]
    );

    return row?.server_id ?? null;
}

export async function insertLocalStop(tripId: string, dto: CreateStopDto): Promise<Stop> {
    const db = await getDB();
    const tripLocalId = await getTripLocalId(tripId);

    if (!tripLocalId) {
        throw new Error(`Trip not found locally: ${tripId}`);
    }

    const localId = createLocalId("stop");
    const timestamp = nowIso();
    const orderIndex = await getNextOrderIndex(tripLocalId);

    await db.withTransactionAsync(async () => {
        await db.runAsync(`
            INSERT INTO stops (
                local_id, server_id, trip_local_id, title, description,
                start_date, end_date, country, order_index, sync_status,
                created_at, updated_at, deleted_at
            )
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL)
        `, [
            localId,
            tripLocalId,
            dto.title,
            dto.description ?? null,
            dto.startDate ?? null,
            dto.endDate ?? null,
            dto.country ?? null,
            orderIndex,
            timestamp,
            timestamp,
        ]);

        await replaceStopTravelModes(localId, dto.travelModes ?? [], "pending");
    });

    return {
        id: localId,
        clientId: localId,
        tripId,
        title: dto.title,
        description: dto.description ?? null,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        country: dto.country ?? null,
        orderIndex,
        createdAt: timestamp,
        updatedAt: timestamp,
        travelModes: dto.travelModes ?? [],
    };
}

export async function markLocalStopSynced(localId: string, serverStop: Stop): Promise<void> {
    const db = await getDB();
    const timestamp = nowIso();

    await db.withTransactionAsync(async () => {
        await db.runAsync(`
            UPDATE stops
            SET server_id = ?,
                title = ?,
                description = ?,
                start_date = ?,
                end_date = ?,
                country = ?,
                order_index = ?,
                sync_status = 'synced',
                updated_at = ?,
                deleted_at = NULL
            WHERE local_id = ?
        `, [
            serverStop.id,
            serverStop.title,
            serverStop.description ?? null,
            serverStop.startDate ?? null,
            serverStop.endDate ?? null,
            serverStop.country ?? null,
            serverStop.orderIndex,
            timestamp,
            localId,
        ]);

        await replaceStopTravelModes(localId, serverStop.travelModes ?? [], "synced");
    });
}

export async function upsertStopFromServer(tripId: string, stop: Stop): Promise<void> {
    const db = await getDB();
    const tripLocalId = await getTripLocalId(tripId);

    if (!tripLocalId) {
        throw new Error(`Trip not found locally: ${tripId}`);
    }

    const timestamp = nowIso();
    const existing = await db.getFirstAsync<{local_id: string}>(
        `
        SELECT local_id
        FROM stops
        WHERE server_id = ? OR local_id = ? OR local_id = ?
        LIMIT 1
    `,
        [stop.id, stop.id, stop.clientId ?? ""]
    );

    const localId = existing?.local_id ?? createLocalId("stop");

    await db.withTransactionAsync(async () => {
        await db.runAsync(`
            INSERT INTO stops (
                local_id, server_id, trip_local_id, title, description,
                start_date, end_date, country, order_index, sync_status,
                created_at, updated_at, deleted_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, NULL)
            ON CONFLICT(local_id) DO UPDATE SET
                server_id = excluded.server_id,
                trip_local_id = excluded.trip_local_id,
                title = excluded.title,
                description = excluded.description,
                start_date = excluded.start_date,
                end_date = excluded.end_date,
                country = excluded.country,
                order_index = excluded.order_index,
                sync_status = 'synced',
                updated_at = excluded.updated_at,
                deleted_at = NULL
        `, [
            localId,
            stop.id,
            tripLocalId,
            stop.title,
            stop.description ?? null,
            stop.startDate ?? null,
            stop.endDate ?? null,
            stop.country ?? null,
            stop.orderIndex,
            stop.createdAt ?? timestamp,
            timestamp,
        ]);

        await replaceStopTravelModes(localId, stop.travelModes ?? [], "synced");
    });
}

export async function upsertStopsFromServer(tripId: string, stops: Stop[]): Promise<void> {
    for (const stop of stops) {
        await upsertStopFromServer(tripId, stop);
    }
}

export async function getLocalStopTravelModes(stopLocalId: string): Promise<TravelModeKey[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<TravelModeRow>(`
        SELECT DISTINCT mode
        FROM stop_travel_modes
        WHERE stop_local_id = ?
          AND deleted_at IS NULL
        ORDER BY mode ASC
    `, [stopLocalId]);

    return rows.map((row) => row.mode);
}

function stopModeLocalId(stopLocalId: string, mode: TravelModeKey): string {
    return `stop_mode_${stopLocalId}_${mode}`;
}

export async function replaceStopTravelModes(
    stopLocalId: string,
    travelModes: TravelModeKey[],
    syncStatus: SyncStatus = "pending"
): Promise<void> {
    const db = await getDB();
    const timestamp = nowIso();
    const uniqueModes = Array.from(new Set(travelModes));

    await db.runAsync(`
        DELETE FROM stop_travel_modes
        WHERE stop_local_id = ?
    `, [stopLocalId]);

    for (const mode of uniqueModes) {
        await db.runAsync(`
            INSERT OR REPLACE INTO stop_travel_modes (
                local_id, stop_local_id, mode, sync_status, created_at, updated_at, deleted_at
            )
            VALUES (?, ?, ?, ?, ?, ?, NULL)
        `, [
            stopModeLocalId(stopLocalId, mode),
            stopLocalId,
            mode,
            syncStatus,
            timestamp,
            timestamp,
        ]);
    }
}
