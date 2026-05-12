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
    `);
}

export async function createTripTable() {
    await initializeLocalSchema();
}
