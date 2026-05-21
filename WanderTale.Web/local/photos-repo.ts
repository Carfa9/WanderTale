import {Photo} from "@/types/photo";
import {getDB} from "./db";
import {getEntryLocalId} from "./entries-repo";
import {getTripLocalId} from "./trips-repo";

type PhotoInput = {
    imageUri: string;
    caption: string | null;
    photoDate: string | null;
    location: string | null;
    entryId: string | null;
};

type PhotoRow = {
    local_id: string;
    server_id: string | null;
    trip_local_id: string;
    trip_server_id: string | null;
    entry_local_id: string | null;
    entry_server_id: string | null;
    image_uri: string;
    server_image_uri: string | null;
    caption: string | null;
    photo_date: string | null;
    location: string | null;
    created_at: string;
    updated_at: string;
};

type SyncStatus = "synced" | "pending" | "error";

function nowIso() {
    return new Date().toISOString();
}

function createLocalId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function isLocalImageUri(uri: string | null): uri is string {
    return !!uri && /^(file:|content:|data:|blob:)/.test(uri);
}

function stringValue(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

type ReactNativeFormData = FormData & {
    _parts?: Array<[string, unknown]>;
    get?: (key: string) => unknown;
};

function getFormDataPart(formData: FormData, key: string): unknown {
    const nativeFormData = formData as ReactNativeFormData;

    if (typeof nativeFormData.get === "function") {
        return nativeFormData.get(key);
    }

    const parts = nativeFormData._parts;
    return parts?.find(([partKey]) => partKey === key)?.[1] ?? null;
}

export function photoInputFromFormData(formData: FormData): PhotoInput {
    const image = getFormDataPart(formData, "image") as {uri?: string} | null;

    if (!image?.uri) {
        throw new Error("Photo image uri is missing");
    }

    return {
        imageUri: image.uri,
        caption: stringValue(getFormDataPart(formData, "caption")),
        photoDate: stringValue(getFormDataPart(formData, "photoDate")),
        location: stringValue(getFormDataPart(formData, "location")),
        entryId: stringValue(getFormDataPart(formData, "entryId")),
    };
}

function photoFromRow(row: PhotoRow): Photo {
    return {
        id: row.server_id ?? row.local_id,
        tripId: row.trip_server_id ?? row.trip_local_id,
        entryId: row.entry_server_id ?? row.entry_local_id,
        imageUri: isLocalImageUri(row.image_uri) ? row.image_uri : row.server_image_uri ?? row.image_uri,
        caption: row.caption,
        photoDate: row.photo_date,
        location: row.location,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function getLocalPhotosByTripId(tripId: string): Promise<Photo[]> {
    const db = await getDB();
    const rows = await db.getAllAsync<PhotoRow>(`
        SELECT
            p.local_id,
            p.server_id,
            p.trip_local_id,
            t.server_id AS trip_server_id,
            p.entry_local_id,
            e.server_id AS entry_server_id,
            p.image_uri,
            p.server_image_uri,
            p.caption,
            p.photo_date,
            p.location,
            p.created_at,
            p.updated_at
        FROM photos p
        INNER JOIN trips t ON t.local_id = p.trip_local_id
        LEFT JOIN entries e ON e.local_id = p.entry_local_id
        WHERE p.deleted_at IS NULL
          AND (p.trip_local_id = ? OR t.server_id = ?)
        ORDER BY p.created_at DESC
    `, [tripId, tripId]);

    return rows.map(photoFromRow);
}

export async function getLocalPhotoForSync(localId: string): Promise<{photo: Photo; tripLocalId: string; entryLocalId: string | null} | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<PhotoRow>(`
        SELECT
            p.local_id,
            p.server_id,
            p.trip_local_id,
            t.server_id AS trip_server_id,
            p.entry_local_id,
            e.server_id AS entry_server_id,
            p.image_uri,
            p.server_image_uri,
            p.caption,
            p.photo_date,
            p.location,
            p.created_at,
            p.updated_at
        FROM photos p
        INNER JOIN trips t ON t.local_id = p.trip_local_id
        LEFT JOIN entries e ON e.local_id = p.entry_local_id
        WHERE p.local_id = ?
          AND p.deleted_at IS NULL
        LIMIT 1
    `, [localId]);

    if (!row) return null;

    return {
        photo: photoFromRow(row),
        tripLocalId: row.trip_local_id,
        entryLocalId: row.entry_local_id,
    };
}

export async function getPhotoLocalId(id: string): Promise<string | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{local_id: string}>(`
        SELECT local_id
        FROM photos
        WHERE local_id = ? OR server_id = ?
        LIMIT 1
    `, [id, id]);

    return row?.local_id ?? null;
}

export async function getPhotoServerId(localId: string): Promise<string | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{server_id: string | null}>(`
        SELECT server_id
        FROM photos
        WHERE local_id = ?
        LIMIT 1
    `, [localId]);

    return row?.server_id ?? null;
}

export async function insertLocalPhoto(tripId: string, input: PhotoInput): Promise<Photo> {
    const db = await getDB();
    const tripLocalId = await getTripLocalId(tripId);

    if (!tripLocalId) {
        throw new Error(`Trip not found locally: ${tripId}`);
    }

    const entryLocalId = input.entryId ? await getEntryLocalId(input.entryId) : null;
    const localId = createLocalId("photo");
    const timestamp = nowIso();

    await db.runAsync(`
        INSERT INTO photos (
            local_id, server_id, trip_local_id, entry_local_id, image_uri,
            server_image_uri, caption, photo_date, location, sync_status,
            created_at, updated_at, deleted_at
        )
        VALUES (?, NULL, ?, ?, ?, NULL, ?, ?, ?, 'pending', ?, ?, NULL)
    `, [
        localId,
        tripLocalId,
        entryLocalId,
        input.imageUri,
        input.caption,
        input.photoDate,
        input.location,
        timestamp,
        timestamp,
    ]);

    return {
        id: localId,
        tripId,
        entryId: input.entryId,
        imageUri: input.imageUri,
        caption: input.caption,
        photoDate: input.photoDate,
        location: input.location,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

export async function hardDeleteLocalPhoto(localId: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(`DELETE FROM photos WHERE local_id = ?`, [localId]);
}

export async function getSoftDeletedLocalPhotoId(localId: string): Promise<string | null> {
    const db = await getDB();
    const row = await db.getFirstAsync<{local_id: string}>(`
        SELECT local_id
        FROM photos
        WHERE local_id = ?
          AND deleted_at IS NOT NULL
        LIMIT 1
    `, [localId]);

    return row?.local_id ?? null;
}

export async function markLocalPhotoSynced(localId: string, serverPhoto: Photo): Promise<void> {
    const db = await getDB();

    await db.runAsync(`
        UPDATE photos
        SET server_id = ?,
            server_image_uri = ?,
            caption = ?,
            photo_date = ?,
            location = ?,
            sync_status = 'synced',
            updated_at = ?
        WHERE local_id = ?
          AND deleted_at IS NULL
    `, [
        serverPhoto.id,
        serverPhoto.imageUri,
        serverPhoto.caption ?? null,
        serverPhoto.photoDate ?? null,
        serverPhoto.location ?? null,
        nowIso(),
        localId,
    ]);
}

export async function upsertPhotoFromServer(tripId: string, photo: Photo): Promise<void> {
    const db = await getDB();
    const tripLocalId = await getTripLocalId(tripId);

    if (!tripLocalId) {
        throw new Error(`Trip not found locally: ${tripId}`);
    }

    const entryLocalId = photo.entryId ? await getEntryLocalId(photo.entryId) : null;
    const timestamp = nowIso();
    const existing = await db.getFirstAsync<{
        local_id: string;
        server_id: string | null;
        sync_status: SyncStatus;
        deleted_at: string | null;
    }>(`
        SELECT local_id, server_id, sync_status, deleted_at
        FROM photos
        WHERE server_id = ? OR local_id = ?
        LIMIT 1
    `, [photo.id, photo.id]);

    if (existing?.deleted_at) {
        return;
    }

    if (existing && (existing.sync_status === "pending" || existing.sync_status === "error")) {
        if (!existing.server_id) {
            await db.runAsync(`
                UPDATE photos
                SET server_id = ?, updated_at = ?
                WHERE local_id = ? AND server_id IS NULL
            `, [photo.id, timestamp, existing.local_id]);
        }
        return;
    }

    const localId = existing?.local_id ?? createLocalId("photo");

    await db.runAsync(`
        INSERT INTO photos (
            local_id, server_id, trip_local_id, entry_local_id, image_uri,
            server_image_uri, caption, photo_date, location, sync_status,
            created_at, updated_at, deleted_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, NULL)
        ON CONFLICT(local_id) DO UPDATE SET
            server_id = excluded.server_id,
            trip_local_id = excluded.trip_local_id,
            entry_local_id = excluded.entry_local_id,
            server_image_uri = excluded.server_image_uri,
            caption = excluded.caption,
            photo_date = excluded.photo_date,
            location = excluded.location,
            sync_status = 'synced',
            updated_at = excluded.updated_at,
            deleted_at = NULL
    `, [
        localId,
        photo.id,
        tripLocalId,
        entryLocalId,
        photo.imageUri,
        photo.imageUri,
        photo.caption ?? null,
        photo.photoDate ?? null,
        photo.location ?? null,
        photo.createdAt ?? timestamp,
        timestamp,
    ]);
}

export async function upsertPhotosFromServer(tripId: string, photos: Photo[]): Promise<void> {
    for (const photo of photos) {
        await upsertPhotoFromServer(tripId, photo);
    }
}

export async function markLocalPhotoDeleted(photoId: string): Promise<void> {
    const db = await getDB();

    await db.runAsync(`
        UPDATE photos
        SET deleted_at = ?,
            sync_status = 'pending',
            updated_at = ?
        WHERE local_id = ? OR server_id = ?
    `, [nowIso(), nowIso(), photoId, photoId]);
}

export async function updateLocalPhotoCaption(photoId: string, caption: string | null): Promise<void> {
    const db = await getDB();

    await db.runAsync(`
        UPDATE photos
        SET caption = ?,
            sync_status = 'pending',
            updated_at = ?
        WHERE local_id = ? OR server_id = ?
    `, [caption, nowIso(), photoId, photoId]);
}
