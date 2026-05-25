import {CreateTripDto, Trip} from "@/types/trip";
import {TravelModeKey} from "@/types/travelMode";
import {getDB} from "./db";
import {requireCurrentOwnerEmail} from "@/local/account";

type TripRow = {
    local_id: string;
    server_id: string | null;
    title: string;
    destination: string | null;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
};

type TravelModeRow = {
    mode: TravelModeKey;
};

type SyncStatus = "synced" | "pending" | "error";

function nowIso() {
    return new Date().toISOString();
}

function createLocalId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function tripFromRow(row: TripRow, travelModes: TravelModeKey[]): Trip {
    return {
        id: row.server_id ?? row.local_id,
        clientId: row.local_id,
        title: row.title,
        destination: row.destination,
        startDate: row.start_date,
        endDate: row.end_date,
        description: row.description,
        travelModes,
    };
}

export async function getLocalTrips(): Promise<Trip[]> {
    const db = await getDB();
    const ownerEmail = await requireCurrentOwnerEmail();
    const rows = await db.getAllAsync<TripRow>(`
        SELECT local_id, server_id, title, destination, start_date, end_date, description
        FROM trips
        WHERE deleted_at IS NULL
          AND owner_email = ?
        ORDER BY COALESCE(start_date, created_at) ASC
    `, [ownerEmail]);

    return Promise.all(
        rows.map(async row =>
            tripFromRow(row, await getLocalTripTravelModes(row.local_id))
        )
    );
}

export async function getLocalTripById(id: string): Promise<Trip | null> {
    const db = await getDB();
    const ownerEmail = await requireCurrentOwnerEmail();
    const row = await db.getFirstAsync<TripRow>(`
        SELECT local_id, server_id, title, destination, start_date, end_date, description
        FROM trips
        WHERE deleted_at IS NULL
          AND owner_email = ?
          AND (local_id = ? OR server_id = ?)
        LIMIT 1
    `, [ownerEmail, id, id]);

    if (!row) return null;
    return tripFromRow(row, await getLocalTripTravelModes(row.local_id));
}

export async function getTripLocalId(id: string): Promise<string | null> {
    const db = await getDB();
    const ownerEmail = await requireCurrentOwnerEmail();
    const row = await db.getFirstAsync<{local_id: string}>(`
        SELECT local_id
        FROM trips
        WHERE deleted_at IS NULL
          AND owner_email = ?
          AND (local_id = ? OR server_id = ?)
        LIMIT 1
    `, [ownerEmail, id, id]);

    return row?.local_id ?? null;
}

export async function getTripServerId(localId: string): Promise<string | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{server_id: string | null}>(`
        SELECT server_id
        FROM trips
        WHERE local_id = ?
        LIMIT 1
    `, [localId]);

    return row?.server_id ?? null;
}

export async function insertLocalTrip(dto: CreateTripDto): Promise<Trip> {
    const db = await getDB();
    const ownerEmail = await requireCurrentOwnerEmail();
    const localId = createLocalId("trip");
    const timestamp = nowIso();

    await db.withTransactionAsync(async () => {
        await db.runAsync(`
            INSERT INTO trips (
                local_id, server_id, title, destination, start_date, end_date,
                description, sync_status, created_at, updated_at, deleted_at, owner_email
            )
            VALUES (?, NULL, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL, ?)
        `, [
            localId,
            dto.title,
            dto.destination ?? null,
            dto.startDate ?? null,
            dto.endDate ?? null,
            dto.description ?? null,
            timestamp,
            timestamp,
            ownerEmail,
        ]);

        await replaceTripTravelModes(localId, dto.travelModes ?? [], "pending");
    });

    return {
        id: localId,
        clientId: localId,
        title: dto.title,
        destination: dto.destination ?? null,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        description: dto.description ?? null,
        travelModes: dto.travelModes ?? [],
    };
}

export async function updateLocalTrip(id: string, dto: CreateTripDto): Promise<Trip> {
    const db = await getDB();
    const localId = await getTripLocalId(id);

    if (!localId) {
        throw new Error(`Trip not found locally: ${id}`);
    }

    const timestamp = nowIso();

    await db.withTransactionAsync(async () => {
        await db.runAsync(`
            UPDATE trips
            SET title = ?,
                destination = ?,
                start_date = ?,
                end_date = ?,
                description = ?,
                sync_status = 'pending',
                updated_at = ?
            WHERE local_id = ?
        `, [
            dto.title,
            dto.destination ?? null,
            dto.startDate ?? null,
            dto.endDate ?? null,
            dto.description ?? null,
            timestamp,
            localId,
        ]);

        await replaceTripTravelModes(localId, dto.travelModes ?? [], "pending");
    });

    return {
        id,
        clientId: localId,
        title: dto.title,
        destination: dto.destination ?? null,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        description: dto.description ?? null,
        travelModes: dto.travelModes ?? [],
    };
}

export async function markLocalTripDeleted(id: string): Promise<string | null> {
    const db = await getDB();
    const localId = await getTripLocalId(id);

    if (!localId) return null;

    const timestamp = nowIso();
    await db.runAsync(`
        UPDATE trips
        SET deleted_at = ?,
            sync_status = 'pending',
            updated_at = ?
        WHERE local_id = ?
    `, [timestamp, timestamp, localId]);

    return localId;
}

export async function hardDeleteLocalTrip(localId: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(`DELETE FROM trips WHERE local_id = ?`, [localId]);
}

export async function markLocalTripDeleteSynced(localId: string, serverId?: string | null): Promise<void> {
    const db = await getDB();
    const timestamp = nowIso();

    await db.runAsync(`
        UPDATE trips
        SET server_id = COALESCE(server_id, ?),
            sync_status = 'synced',
            updated_at = ?
        WHERE local_id = ?
          AND deleted_at IS NOT NULL
    `, [serverId ?? null, timestamp, localId]);
}

export async function getSoftDeletedLocalTripId(localId: string): Promise<string | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{local_id: string}>(`
        SELECT local_id
        FROM trips
        WHERE local_id = ?
          AND deleted_at IS NOT NULL
        LIMIT 1
    `, [localId]);

    return row?.local_id ?? null;
}

async function getSoftDeletedTripBySignature(trip: Trip): Promise<{local_id: string} | null> {
    const db = await getDB();
    const ownerEmail = await requireCurrentOwnerEmail();

    return db.getFirstAsync<{local_id: string}>(`
        SELECT local_id
        FROM trips
        WHERE deleted_at IS NOT NULL
          AND owner_email = ?
          AND title = ?
          AND COALESCE(destination, '') = COALESCE(?, '')
          AND COALESCE(start_date, '') = COALESCE(?, '')
          AND COALESCE(end_date, '') = COALESCE(?, '')
        LIMIT 1
    `, [
        ownerEmail,
        trip.title,
        trip.destination ?? null,
        trip.startDate ?? null,
        trip.endDate ?? null,
    ]);
}

export async function markLocalTripSynced(localId: string, serverTrip: Trip): Promise<void> {
    const db = await getDB();
    const timestamp = nowIso();

    await db.withTransactionAsync(async () => {
        await db.runAsync(`
            UPDATE trips
            SET server_id = ?,
                title = ?,
                destination = ?,
                start_date = ?,
                end_date = ?,
                description = ?,
                sync_status = 'synced',
                updated_at = ?
            WHERE local_id = ?
              AND deleted_at IS NULL
        `, [
            serverTrip.id,
            serverTrip.title,
            serverTrip.destination ?? null,
            serverTrip.startDate ?? null,
            serverTrip.endDate ?? null,
            serverTrip.description ?? null,
            timestamp,
            localId,
        ]);

        await replaceTripTravelModes(localId, serverTrip.travelModes ?? [], "synced");
    });
}

export async function upsertTripFromServer(trip: Trip): Promise<void> {
    const db = await getDB();
    const ownerEmail = await requireCurrentOwnerEmail();
    const timestamp = nowIso();
    const existing = await db.getFirstAsync<{
        local_id: string;
        server_id: string | null;
        sync_status: SyncStatus;
        deleted_at: string | null;
    }>(`
        SELECT local_id, server_id, sync_status, deleted_at
        FROM trips
        WHERE owner_email = ?
          AND (server_id = ? OR local_id = ? OR local_id = ?)
        LIMIT 1
    `, [ownerEmail, trip.id, trip.id, trip.clientId ?? ""]);

    if (existing?.deleted_at) {
        return;
    }

    const deletedBySignature = await getSoftDeletedTripBySignature(trip);
    if (deletedBySignature) {
        return;
    }

    if (existing && (existing.sync_status === "pending" || existing.sync_status === "error")) {
        if (!existing.server_id) {
            await db.withTransactionAsync(async () => {
                await db.runAsync(`
                    UPDATE trips
                    SET server_id = ?,
                        sync_status = 'synced',
                        updated_at = ?
                    WHERE local_id = ? AND server_id IS NULL
                `, [trip.id, timestamp, existing.local_id]);

                await replaceTripTravelModes(existing.local_id, trip.travelModes ?? [], "synced");
            });
        }
        return;
    }

    const localId = existing?.local_id ?? createLocalId("trip");

    await db.withTransactionAsync(async () => {
        await db.runAsync(`
            INSERT INTO trips (
                local_id, server_id, title, destination, start_date, end_date,
                description, sync_status, created_at, updated_at, deleted_at, owner_email
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, NULL, ?)
            ON CONFLICT(local_id) DO UPDATE SET
                server_id = excluded.server_id,
                title = excluded.title,
                destination = excluded.destination,
                start_date = excluded.start_date,
                end_date = excluded.end_date,
                description = excluded.description,
                sync_status = 'synced',
                updated_at = excluded.updated_at,
                deleted_at = NULL,
                owner_email = excluded.owner_email
        `, [
            localId,
            trip.id,
            trip.title,
            trip.destination ?? null,
            trip.startDate ?? null,
            trip.endDate ?? null,
            trip.description ?? null,
            timestamp,
            timestamp,
            ownerEmail,
        ]);

        await replaceTripTravelModes(localId, trip.travelModes ?? [], "synced");
    });
}

export async function upsertTripsFromServer(trips: Trip[]): Promise<void> {
    for (const trip of trips) {
        await upsertTripFromServer(trip);
    }
}

export async function getLocalTripTravelModes(tripLocalId: string): Promise<TravelModeKey[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<TravelModeRow>(`
        SELECT DISTINCT mode
        FROM trip_travel_modes
        WHERE trip_local_id = ?
          AND deleted_at IS NULL
        ORDER BY mode ASC
    `, [tripLocalId]);

    return rows.map((row) => row.mode);
}

function tripModeLocalId(tripLocalId: string, mode: TravelModeKey): string {
    return `trip_mode_${tripLocalId}_${mode}`;
}

export async function replaceTripTravelModes(
    tripLocalId: string,
    travelModes: TravelModeKey[],
    syncStatus: SyncStatus = "pending"
) {
    const db = await getDB();
    const timestamp = nowIso();
    const uniqueModes = Array.from(new Set(travelModes));

    await db.runAsync(`
        DELETE FROM trip_travel_modes
        WHERE trip_local_id = ?
    `, [tripLocalId]);

    for (const mode of uniqueModes) {
        await db.runAsync(`
            INSERT OR REPLACE INTO trip_travel_modes (
                local_id, trip_local_id, mode, sync_status, created_at, updated_at, deleted_at
            )
            VALUES (?, ?, ?, ?, ?, ?, NULL)
        `, [
            tripModeLocalId(tripLocalId, mode),
            tripLocalId,
            mode,
            syncStatus,
            timestamp,
            timestamp,
        ]);
    }
}
