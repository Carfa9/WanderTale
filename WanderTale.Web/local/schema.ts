import {getDB} from "./db";

export async function initializeLocalSchema() {
    const db = await getDB();

    await db.execAsync(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS trips (
            local_id TEXT PRIMARY KEY NOT NULL,
            server_id TEXT UNIQUE,
            title TEXT NOT NULL,
            destination TEXT,
            start_date TEXT,
            end_date TEXT,
            description TEXT,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
        );

        CREATE TABLE IF NOT EXISTS trip_travel_modes (
            local_id TEXT PRIMARY KEY NOT NULL,
            trip_local_id TEXT NOT NULL,
            mode TEXT NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT,
            FOREIGN KEY (trip_local_id) REFERENCES trips(local_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_trip_travel_modes_trip_local_id
            ON trip_travel_modes(trip_local_id);

        CREATE TABLE IF NOT EXISTS entries (
            local_id TEXT PRIMARY KEY NOT NULL,
            server_id TEXT UNIQUE,
            trip_local_id TEXT NOT NULL,
            title TEXT,
            content TEXT,
            entry_date TEXT,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT,
            FOREIGN KEY (trip_local_id) REFERENCES trips(local_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_entries_trip_local_id
            ON entries(trip_local_id);

        CREATE TABLE IF NOT EXISTS stops (
            local_id TEXT PRIMARY KEY NOT NULL,
            server_id TEXT UNIQUE,
            trip_local_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            start_date TEXT,
            end_date TEXT,
            country TEXT,
            order_index INTEGER NOT NULL DEFAULT 0,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT,
            FOREIGN KEY (trip_local_id) REFERENCES trips(local_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_stops_trip_local_id
            ON stops(trip_local_id);

        CREATE TABLE IF NOT EXISTS stop_travel_modes (
            local_id TEXT PRIMARY KEY NOT NULL,
            stop_local_id TEXT NOT NULL,
            mode TEXT NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT,
            FOREIGN KEY (stop_local_id) REFERENCES stops(local_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_stop_travel_modes_stop_local_id
            ON stop_travel_modes(stop_local_id);

        CREATE TABLE IF NOT EXISTS photos (
            local_id TEXT PRIMARY KEY NOT NULL,
            server_id TEXT UNIQUE,
            trip_local_id TEXT NOT NULL,
            entry_local_id TEXT,
            image_uri TEXT NOT NULL,
            server_image_uri TEXT,
            caption TEXT,
            photo_date TEXT,
            location TEXT,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT,
            FOREIGN KEY (trip_local_id) REFERENCES trips(local_id) ON DELETE CASCADE,
            FOREIGN KEY (entry_local_id) REFERENCES entries(local_id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_photos_trip_local_id
            ON photos(trip_local_id);

        CREATE INDEX IF NOT EXISTS idx_photos_entry_local_id
            ON photos(entry_local_id);

        CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY NOT NULL,
            entity_type TEXT NOT NULL,
            entity_local_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sync_queue_status_created_at
            ON sync_queue(status, created_at);

        DELETE FROM trips
        WHERE server_id IS NULL
          AND deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM trips t2
            WHERE t2.server_id IS NOT NULL
              AND t2.deleted_at IS NULL
              AND t2.title = trips.title
              AND COALESCE(t2.destination, '') = COALESCE(trips.destination, '')
              AND COALESCE(t2.start_date, '') = COALESCE(trips.start_date, '')
              AND COALESCE(t2.end_date, '') = COALESCE(trips.end_date, '')
          );

        DELETE FROM entries
        WHERE server_id IS NULL
          AND deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM entries e2
            WHERE e2.server_id IS NOT NULL
              AND e2.deleted_at IS NULL
              AND e2.trip_local_id = entries.trip_local_id
              AND COALESCE(e2.title, '') = COALESCE(entries.title, '')
              AND COALESCE(e2.content, '') = COALESCE(entries.content, '')
              AND COALESCE(e2.entry_date, '') = COALESCE(entries.entry_date, '')
          );

        DELETE FROM trip_travel_modes
        WHERE local_id NOT IN (
            SELECT MIN(local_id) FROM trip_travel_modes GROUP BY trip_local_id, mode
        );

        DELETE FROM stop_travel_modes
        WHERE local_id NOT IN (
            SELECT MIN(local_id) FROM stop_travel_modes GROUP BY stop_local_id, mode
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_trip_travel_modes_trip_mode
            ON trip_travel_modes(trip_local_id, mode);

        CREATE UNIQUE INDEX IF NOT EXISTS ux_stop_travel_modes_stop_mode
            ON stop_travel_modes(stop_local_id, mode);
    `);

    await ensureColumn("trips", "owner_email", "TEXT");
    await ensureColumn("sync_queue", "owner_email", "TEXT");

    await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_trips_owner_email
            ON trips(owner_email);

        CREATE INDEX IF NOT EXISTS idx_sync_queue_owner_status_created_at
            ON sync_queue(owner_email, status, created_at);
    `);
}

export async function createTripTable() {
    await initializeLocalSchema();
}

async function ensureColumn(tableName: string, columnName: string, columnDefinition: string) {
    const db = await getDB();
    const rows = await db.getAllAsync<{name: string}>(`PRAGMA table_info(${tableName})`);
    const exists = rows.some((row) => row.name === columnName);

    if (!exists) {
        await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    }
}
