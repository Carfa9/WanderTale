import {CreateTripDto, Trip} from "@/types/trip";
import {TravelModeKey} from "@/types/travelMode";
import {getDB} from "./db";

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
    const rows = await db.getAllAsync<TripRow>(`
        SELECT local_id, server_id, title, destination, start_date, end_date, description
        FROM trips
        WHERE deleted_at IS NULL
        ORDER BY COALESCE(start_date, created_at) ASC
    `);

    return Promise.all(
        rows.map(async row =>
            tripFromRow(row, await getLocalTripTravelModes(row.local_id))
        )
    );
}

export async function getLocalTripById(id: string): Promise<Trip | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<TripRow>(`
        SELECT local_id, server_id, title, destination, start_date, end_date, description
        FROM trips
        WHERE deleted_at IS NULL
          AND (local_id = ? OR server_id = ?)
        LIMIT 1
    `, [id, id]);

    if (!row) return null;
    return tripFromRow(row, await getLocalTripTravelModes(row.local_id));
}

export async function getTripLocalId(id: string): Promise<string | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{local_id: string}>(`
        SELECT local_id
        FROM trips
        WHERE deleted_at IS NULL
          AND (local_id = ? OR server_id = ?)
        LIMIT 1
    `, [id, id]);

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
    const localId = createLocalId("trip");
    const timestamp = nowIso();

    await db.withTransactionAsync(async () => {
        await db.runAsync(`
            INSERT INTO trips (
                local_id, server_id, title, destination, start_date, end_date,
                description, sync_status, created_at, updated_at, deleted_at
            )
            VALUES (?, NULL, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL)
        `, [
            localId,
            dto.title,
            dto.destination ?? null,
            dto.startDate ?? null,
            dto.endDate ?? null,
            dto.description ?? null,
            timestamp,
            timestamp,
        ]);

        await replaceTripTravelModes(localId, dto.travelModes ?? [], "pending");
    });

    return {
        id: localId,
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
                updated_at = ?,
                deleted_at = NULL
            WHERE local_id = ?
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
    const timestamp = nowIso();
    const existing = await db.getFirstAsync<{local_id: string}>(`
        SELECT local_id
        FROM trips
        WHERE server_id = ? OR local_id = ?
        LIMIT 1
    `, [trip.id, trip.id]);

    const localId = existing?.local_id ?? createLocalId("trip");

    await db.withTransactionAsync(async () => {
        await db.runAsync(`
            INSERT INTO trips (
                local_id, server_id, title, destination, start_date, end_date,
                description, sync_status, created_at, updated_at, deleted_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, NULL)
            ON CONFLICT(local_id) DO UPDATE SET
                server_id = excluded.server_id,
                title = excluded.title,
                destination = excluded.destination,
                start_date = excluded.start_date,
                end_date = excluded.end_date,
                description = excluded.description,
                sync_status = 'synced',
                updated_at = excluded.updated_at,
                deleted_at = NULL
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
        SELECT mode
        FROM trip_travel_modes
        WHERE trip_local_id = ?
          AND deleted_at IS NULL
        ORDER BY created_at ASC
    `, [tripLocalId]);

    return rows.map((row) => row.mode);
}

export async function replaceTripTravelModes(
    tripLocalId: string,
    travelModes: TravelModeKey[],
    syncStatus: SyncStatus = "pending"
) {
    const db = await getDB();
    const timestamp = nowIso();

    await db.runAsync(`
        DELETE FROM trip_travel_modes
        WHERE trip_local_id = ?
    `, [tripLocalId]);

    for (const mode of travelModes) {
        await db.runAsync(`
            INSERT INTO trip_travel_modes (
                local_id, trip_local_id, mode, sync_status, created_at, updated_at, deleted_at
            )
            VALUES (?, ?, ?, ?, ?, ?, NULL)
        `, [
            createLocalId("trip_mode"),
            tripLocalId,
            mode,
            syncStatus,
            timestamp,
            timestamp,
        ]);
    }
}
