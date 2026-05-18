import {api_url} from "@/api/config";
import {getEntryServerId, getLocalEntryForSync, markLocalEntrySynced} from "@/local/entries-repo";
import {getLocalPhotoForSync, getPhotoServerId, markLocalPhotoSynced} from "@/local/photos-repo";
import {getLocalStopForSync, markLocalStopSynced} from "@/local/stops-repo";
import {getLocalTripById, getTripServerId, markLocalTripSynced} from "@/local/trips-repo";
import {CreateStopDto, Stop} from "@/types/stop";
import {CreateEntryDto} from "@/dto/createEntryDto";
import {Photo} from "@/types/photo";
import {CreateTripDto, Trip} from "@/types/trip";
import {
    getPendingSyncQueue,
    markSyncQueueItemError,
    markSyncQueueItemProcessing,
    markSyncQueueItemSynced,
    SyncQueueItem,
} from "./sync-queue";

let isProcessing = false;

async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 4000): Promise<Response> {
    return Promise.race([
        fetch(url, options),
        new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
    ]);
}

async function syncTripCreate(item: SyncQueueItem): Promise<void> {
    const localTrip = await getLocalTripById(item.entity_local_id);

    if (!localTrip) return;

    const existingServerId = await getTripServerId(item.entity_local_id);

    if (existingServerId) return;

    const dto: CreateTripDto = JSON.parse(item.payload);

    const response = await fetchWithTimeout(`${api_url}/trips`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dto),
    });
    const text = await response.text();

    if (!response.ok) {
        throw new Error(text || `HTTP ${response.status}`);
    }

    const serverTrip: Trip = JSON.parse(text);
    await markLocalTripSynced(item.entity_local_id, serverTrip);
}

async function syncTripUpdate(item: SyncQueueItem): Promise<void> {
    const tripServerId = await getTripServerId(item.entity_local_id);

    if (!tripServerId) {
        throw new Error(`Trip is not synced yet: ${item.entity_local_id}`);
    }

    const dto: CreateTripDto = JSON.parse(item.payload);
    const response = await fetchWithTimeout(`${api_url}/trips/${tripServerId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dto),
    });
    const text = await response.text();

    if (!response.ok) {
        throw new Error(text || `HTTP ${response.status}`);
    }

    const serverTrip: Trip = JSON.parse(text);
    await markLocalTripSynced(item.entity_local_id, serverTrip);
}

async function syncTripDelete(item: SyncQueueItem): Promise<void> {
    const tripServerId = await getTripServerId(item.entity_local_id);

    if (!tripServerId) return;

    const response = await fetchWithTimeout(`${api_url}/trips/${tripServerId}`, {method: "DELETE"});

    if (!response.ok && response.status !== 404) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
    }
}

async function syncStopCreate(item: SyncQueueItem): Promise<void> {
    const localStop = await getLocalStopForSync(item.entity_local_id);

    if (!localStop) {
        throw new Error(`Local stop not found: ${item.entity_local_id}`);
    }

    const tripServerId = await getTripServerId(localStop.tripLocalId);

    if (!tripServerId) {
        throw new Error(`Trip is not synced yet: ${localStop.tripLocalId}`);
    }

    const dto: CreateStopDto = JSON.parse(item.payload);
    const response = await fetchWithTimeout(`${api_url}/trips/${tripServerId}/stops`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dto),
    });
    const text = await response.text();

    if (!response.ok) {
        throw new Error(text || `HTTP ${response.status}`);
    }

    const serverStop: Stop = JSON.parse(text);
    await markLocalStopSynced(item.entity_local_id, serverStop);
}

async function syncEntryCreate(item: SyncQueueItem): Promise<void> {
    const existingServerId = await getEntryServerId(item.entity_local_id);

    if (existingServerId) {
        return;
    }

    const localEntry = await getLocalEntryForSync(item.entity_local_id);

    if (!localEntry) {
        throw new Error(`Local entry not found: ${item.entity_local_id}`);
    }

    const tripServerId = await getTripServerId(localEntry.tripLocalId);

    if (!tripServerId) {
        throw new Error(`Trip is not synced yet: ${localEntry.tripLocalId}`);
    }

    const dto: CreateEntryDto = JSON.parse(item.payload);
    const response = await fetchWithTimeout(`${api_url}/trips/${tripServerId}/entries`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dto),
    });
    const text = await response.text();

    if (!response.ok) {
        throw new Error(text || `HTTP ${response.status}`);
    }

    const serverEntry = JSON.parse(text);
    await markLocalEntrySynced(item.entity_local_id, serverEntry);
}

async function syncEntryUpdate(item: SyncQueueItem): Promise<void> {
    const entryServerId = await getEntryServerId(item.entity_local_id);

    if (!entryServerId) {
        throw new Error(`Entry is not synced yet: ${item.entity_local_id}`);
    }

    const dto: CreateEntryDto = JSON.parse(item.payload);
    const response = await fetchWithTimeout(`${api_url}/entries/${entryServerId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dto),
    });
    const text = await response.text();

    if (!response.ok) {
        throw new Error(text || `HTTP ${response.status}`);
    }

    const serverEntry = JSON.parse(text);
    await markLocalEntrySynced(item.entity_local_id, serverEntry);
}

async function syncEntryDelete(item: SyncQueueItem): Promise<void> {
    const entryServerId = await getEntryServerId(item.entity_local_id);

    if (!entryServerId) return;

    const response = await fetchWithTimeout(`${api_url}/entries/${entryServerId}`, {method: "DELETE"});

    if (!response.ok && response.status !== 404) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
    }
}

async function syncPhotoCreate(item: SyncQueueItem): Promise<void> {
    const localPhoto = await getLocalPhotoForSync(item.entity_local_id);

    if (!localPhoto) {
        return;
    }

    const tripServerId = await getTripServerId(localPhoto.tripLocalId);

    if (!tripServerId) {
        throw new Error(`Trip is not synced yet: ${localPhoto.tripLocalId}`);
    }

    const entryServerId = localPhoto.entryLocalId
        ? await getEntryServerId(localPhoto.entryLocalId)
        : null;

    if (localPhoto.entryLocalId && !entryServerId) {
        throw new Error(`Entry is not synced yet: ${localPhoto.entryLocalId}`);
    }

    const formData = new FormData();
    if (localPhoto.photo.caption) formData.append("caption", localPhoto.photo.caption);
    if (localPhoto.photo.photoDate) formData.append("photoDate", localPhoto.photo.photoDate);
    if (localPhoto.photo.location) formData.append("location", localPhoto.photo.location);
    if (entryServerId) formData.append("entryId", entryServerId);
    formData.append("image", {
        uri: localPhoto.photo.imageUri,
        name: `photo-${Date.now()}.jpg`,
        type: "image/jpeg",
    } as any);

    const response = await fetchWithTimeout(`${api_url}/trips/${tripServerId}/photos`, {
        method: "POST",
        body: formData,
    });
    const text = await response.text();

    if (!response.ok) {
        throw new Error(text || `HTTP ${response.status}`);
    }

    const serverPhoto: Photo = JSON.parse(text);
    await markLocalPhotoSynced(item.entity_local_id, serverPhoto);
}

async function syncPhotoDelete(item: SyncQueueItem): Promise<void> {
    const photoServerId = await getPhotoServerId(item.entity_local_id);

    if (!photoServerId) {
        return;
    }

    const response = await fetchWithTimeout(`${api_url}/photos/${photoServerId}`, {method: "DELETE"});

    if (!response.ok && response.status !== 404) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
    }
}

async function syncPhotoCaptionUpdate(item: SyncQueueItem): Promise<void> {
    const photoServerId = await getPhotoServerId(item.entity_local_id);

    if (!photoServerId) {
        throw new Error(`Photo is not synced yet: ${item.entity_local_id}`);
    }

    const payload = JSON.parse(item.payload) as {caption: string | null};
    const response = await fetchWithTimeout(`${api_url}/photos/${photoServerId}/caption`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({caption: payload.caption ?? null}),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
    }
}

export async function processPendingSyncQueue(): Promise<void> {
    if (isProcessing) return;
    isProcessing = true;

    try {
        const items = await getPendingSyncQueue();

        for (const item of items) {
            try {
                await markSyncQueueItemProcessing(item.id);

                if (item.entity_type === "trip" && item.operation === "create") {
                    await syncTripCreate(item);
                    await markSyncQueueItemSynced(item.id);
                    continue;
                }

                if (item.entity_type === "trip" && item.operation === "update") {
                    await syncTripUpdate(item);
                    await markSyncQueueItemSynced(item.id);
                    continue;
                }

                if (item.entity_type === "trip" && item.operation === "delete") {
                    await syncTripDelete(item);
                    await markSyncQueueItemSynced(item.id);
                    continue;
                }

                if (item.entity_type === "stop" && item.operation === "create") {
                    await syncStopCreate(item);
                    await markSyncQueueItemSynced(item.id);
                    continue;
                }

                if (item.entity_type === "entry" && item.operation === "create") {
                    await syncEntryCreate(item);
                    await markSyncQueueItemSynced(item.id);
                    continue;
                }

                if (item.entity_type === "entry" && item.operation === "update") {
                    await syncEntryUpdate(item);
                    await markSyncQueueItemSynced(item.id);
                    continue;
                }

                if (item.entity_type === "entry" && item.operation === "delete") {
                    await syncEntryDelete(item);
                    await markSyncQueueItemSynced(item.id);
                    continue;
                }

                if (item.entity_type === "photo" && item.operation === "create") {
                    await syncPhotoCreate(item);
                    await markSyncQueueItemSynced(item.id);
                    continue;
                }

                if (item.entity_type === "photo" && item.operation === "delete") {
                    await syncPhotoDelete(item);
                    await markSyncQueueItemSynced(item.id);
                    continue;
                }

                if (item.entity_type === "photo" && item.operation === "updateCaption") {
                    await syncPhotoCaptionUpdate(item);
                    await markSyncQueueItemSynced(item.id);
                    continue;
                }

                throw new Error(`Unsupported sync operation: ${item.entity_type}/${item.operation}`);
            } catch (error) {
                await markSyncQueueItemError(item.id, error);
            }
        }
    } finally {
        isProcessing = false;
    }
}
