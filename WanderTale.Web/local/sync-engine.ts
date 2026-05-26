import {ApiError, apiFetch} from "@/api/http";
import {
    getEntryServerId,
    getLocalEntryForSync,
    getSoftDeletedLocalEntryId,
    hardDeleteLocalEntry,
    markLocalEntrySynced,
} from "@/local/entries-repo";
import {
    getLocalPhotoForSync,
    getPhotoServerId,
    getSoftDeletedLocalPhotoId,
    hardDeleteLocalPhoto,
    markLocalPhotoSynced,
} from "@/local/photos-repo";
import {
    getLocalStopForSync,
    getSoftDeletedLocalStopId,
    getStopServerId,
    hardDeleteLocalStop,
    markLocalStopSynced,
} from "@/local/stops-repo";
import {
    getLocalTripById,
    getSoftDeletedLocalTripId,
    getTripServerId,
    markLocalTripDeleteSynced,
    markLocalTripSynced,
} from "@/local/trips-repo";
import {CreateStopDto, Stop} from "@/types/stop";
import {CreateEntryDto} from "@/dto/createEntryDto";
import {Entry} from "@/types/entry";
import {Photo} from "@/types/photo";
import {CreateTripDto, Trip} from "@/types/trip";
import {
    getPendingSyncQueue,
    markSyncQueueItemError, markSyncQueueItemFailed,
    markSyncQueueItemProcessing,
    markSyncQueueItemSynced,
    SyncQueueItem,
} from "./sync-queue";

let isProcessing = false;

type ReactNativeFormDataFile = {
    uri: string;
    name: string;
    type: string;
};

function isNotFound(error: unknown): boolean {
    return error instanceof ApiError && error.status === 404;
}

function isUnauthorized(error: unknown): boolean {
    return error instanceof ApiError && error.status === 401;
}

async function syncTripCreate(item: SyncQueueItem): Promise<void> {
    const localTrip = await getLocalTripById(item.entity_local_id);

    if (!localTrip) {
        const softDeleted = await getSoftDeletedLocalTripId(item.entity_local_id);
        if (softDeleted) await markLocalTripDeleteSynced(softDeleted);
        return;
    }

    const existingServerId = await getTripServerId(item.entity_local_id);

    if (existingServerId) return;

    const dto: CreateTripDto & {clientId?: string | null} = JSON.parse(item.payload);
    const serverTrip = await apiFetch<Trip>("/trips", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({...dto, clientId: dto.clientId ?? item.entity_local_id}),
    });

    const softDeletedAfter = await getSoftDeletedLocalTripId(item.entity_local_id);
    if (softDeletedAfter) {
        try {
            await apiFetch<void>(`/trips/${serverTrip.id}`, {method: "DELETE"});
        } catch (error) {
            if (!isNotFound(error)) throw error;
        }
        await markLocalTripDeleteSynced(softDeletedAfter, serverTrip.id);
        return;
    }

    await markLocalTripSynced(item.entity_local_id, serverTrip);
}

async function syncTripUpdate(item: SyncQueueItem): Promise<void> {
    const tripServerId = await getTripServerId(item.entity_local_id);

    if (!tripServerId) {
        throw new Error(`Trip is not synced yet: ${item.entity_local_id}`);
    }

    const dto: CreateTripDto = JSON.parse(item.payload);
    const serverTrip = await apiFetch<Trip>(`/trips/${tripServerId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dto),
    });
    await markLocalTripSynced(item.entity_local_id, serverTrip);
}

async function syncTripDelete(item: SyncQueueItem): Promise<void> {
    const tripServerId = await getTripServerId(item.entity_local_id);

    if (tripServerId) {
        try {
            await apiFetch<void>(`/trips/${tripServerId}`, {method: "DELETE"});
        } catch (error) {
            if (!isNotFound(error)) throw error;
        }
    }

    await markLocalTripDeleteSynced(item.entity_local_id, tripServerId);
}

async function syncStopCreate(item: SyncQueueItem): Promise<void> {
    const existingServerId = await getStopServerId(item.entity_local_id);

    if (existingServerId) return;

    const localStop = await getLocalStopForSync(item.entity_local_id);

    if (!localStop) {
        const softDeleted = await getSoftDeletedLocalStopId(item.entity_local_id);
        if (softDeleted) {
            await hardDeleteLocalStop(softDeleted);
            return;
        }
        throw new Error(`Local stop not found: ${item.entity_local_id}`);
    }

    const tripServerId = await getTripServerId(localStop.tripLocalId);

    if (!tripServerId) {
        throw new Error(`Trip is not synced yet: ${localStop.tripLocalId}`);
    }

    const dto: CreateStopDto & {clientId?: string | null} = JSON.parse(item.payload);
    const serverStop = await apiFetch<Stop>(`/trips/${tripServerId}/stops`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({...dto, clientId: dto.clientId ?? item.entity_local_id}),
    });

    const softDeletedAfter = await getSoftDeletedLocalStopId(item.entity_local_id);
    if (softDeletedAfter) {
        try {
            await apiFetch<void>(`/stops/${serverStop.id}`, {method: "DELETE"});
        } catch (error) {
            if (!isNotFound(error)) throw error;
        }
        await hardDeleteLocalStop(softDeletedAfter);
        return;
    }

    await markLocalStopSynced(item.entity_local_id, serverStop);
}

async function syncStopUpdate(item: SyncQueueItem): Promise<void> {
    const stopServerId = await getStopServerId(item.entity_local_id);

    if (!stopServerId) {
        throw new Error(`Stop is not synced yet: ${item.entity_local_id}`);
    }

    const localStop = await getLocalStopForSync(item.entity_local_id);

    if (!localStop) {
        const softDeleted = await getSoftDeletedLocalStopId(item.entity_local_id);
        if (softDeleted) return;
        throw new Error(`Local stop not found: ${item.entity_local_id}`);
    }

    const dto: CreateStopDto = JSON.parse(item.payload);
    const serverStop = await apiFetch<Stop>(`/stops/${stopServerId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dto),
    });
    await markLocalStopSynced(item.entity_local_id, serverStop);
}

async function syncStopDelete(item: SyncQueueItem): Promise<void> {
    const stopServerId = await getStopServerId(item.entity_local_id);

    if (stopServerId) {
        try {
            await apiFetch<void>(`/stops/${stopServerId}`, {method: "DELETE"});
        } catch (error) {
            if (!isNotFound(error)) throw error;
        }
    }

    await hardDeleteLocalStop(item.entity_local_id);
}

async function syncEntryCreate(item: SyncQueueItem): Promise<void> {
    const existingServerId = await getEntryServerId(item.entity_local_id);

    if (existingServerId) {
        return;
    }

    const localEntry = await getLocalEntryForSync(item.entity_local_id);

    if (!localEntry) {
        const softDeleted = await getSoftDeletedLocalEntryId(item.entity_local_id);
        if (softDeleted) {
            await hardDeleteLocalEntry(softDeleted);
            return;
        }
        throw new Error(`Local entry not found: ${item.entity_local_id}`);
    }

    const tripServerId = await getTripServerId(localEntry.tripLocalId);

    if (!tripServerId) {
        throw new Error(`Trip is not synced yet: ${localEntry.tripLocalId}`);
    }

    const dto: CreateEntryDto & {clientId?: string | null} = JSON.parse(item.payload);
    const serverEntry = await apiFetch<Entry>(`/trips/${tripServerId}/entries`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({...dto, clientId: dto.clientId ?? item.entity_local_id}),
    });

    const softDeletedAfter = await getSoftDeletedLocalEntryId(item.entity_local_id);
    if (softDeletedAfter) {
        try {
            await apiFetch<void>(`/entries/${serverEntry.id}`, {method: "DELETE"});
        } catch (error) {
            if (!isNotFound(error)) throw error;
        }
        await hardDeleteLocalEntry(softDeletedAfter);
        return;
    }

    await markLocalEntrySynced(item.entity_local_id, serverEntry);
}

async function syncEntryUpdate(item: SyncQueueItem): Promise<void> {
    const entryServerId = await getEntryServerId(item.entity_local_id);

    if (!entryServerId) {
        throw new Error(`Entry is not synced yet: ${item.entity_local_id}`);
    }

    const dto: CreateEntryDto = JSON.parse(item.payload);
    const serverEntry = await apiFetch<Entry>(`/entries/${entryServerId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dto),
    });
    await markLocalEntrySynced(item.entity_local_id, serverEntry);
}

async function syncEntryDelete(item: SyncQueueItem): Promise<void> {
    const entryServerId = await getEntryServerId(item.entity_local_id);

    if (entryServerId) {
        try {
            await apiFetch<void>(`/entries/${entryServerId}`, {method: "DELETE"});
        } catch (error) {
            if (!isNotFound(error)) throw error;
        }
    }

    await hardDeleteLocalEntry(item.entity_local_id);
}

async function syncPhotoCreate(item: SyncQueueItem): Promise<void> {
    const localPhoto = await getLocalPhotoForSync(item.entity_local_id);

    if (!localPhoto) {
        const softDeleted = await getSoftDeletedLocalPhotoId(item.entity_local_id);
        if (softDeleted) await hardDeleteLocalPhoto(softDeleted);
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

    formData.append("clientId", item.entity_local_id);
    
    if (localPhoto.photo.caption) formData.append("caption", localPhoto.photo.caption);
    if (localPhoto.photo.photoDate) formData.append("photoDate", localPhoto.photo.photoDate);
    if (localPhoto.photo.location) formData.append("location", localPhoto.photo.location);
    if (entryServerId) formData.append("entryId", entryServerId);
    const image: ReactNativeFormDataFile = {
        uri: localPhoto.photo.imageUri,
        name: `photo-${Date.now()}.jpg`,
        type: "image/jpeg",
    };
    formData.append("image", image as unknown as Blob);

    const serverPhoto = await apiFetch<Photo>(`/trips/${tripServerId}/photos`, {
        method: "POST",
        body: formData,
    });

    const softDeletedAfter = await getSoftDeletedLocalPhotoId(item.entity_local_id);
    if (softDeletedAfter) {
        try {
            await apiFetch<void>(`/photos/${serverPhoto.id}`, {method: "DELETE"});
        } catch (error) {
            if (!isNotFound(error)) throw error;
        }
        await hardDeleteLocalPhoto(softDeletedAfter);
        return;
    }

    await markLocalPhotoSynced(item.entity_local_id, serverPhoto);
}

async function syncPhotoDelete(item: SyncQueueItem): Promise<void> {
    const photoServerId = await getPhotoServerId(item.entity_local_id);

    if (photoServerId) {
        try {
            await apiFetch<void>(`/photos/${photoServerId}`, {method: "DELETE"});
        } catch (error) {
            if (!isNotFound(error)) throw error;
        }
    }

    await hardDeleteLocalPhoto(item.entity_local_id);
}

async function syncPhotoCaptionUpdate(item: SyncQueueItem): Promise<void> {
    const photoServerId = await getPhotoServerId(item.entity_local_id);

    if (!photoServerId) {
        throw new Error(`Photo is not synced yet: ${item.entity_local_id}`);
    }

    const payload = JSON.parse(item.payload) as {caption: string | null};
    await apiFetch<void>(`/photos/${photoServerId}/caption`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({caption: payload.caption ?? null}),
    });
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

                if (item.entity_type === "stop" && item.operation === "update") {
                    await syncStopUpdate(item);
                    await markSyncQueueItemSynced(item.id);
                    continue;
                }

                if (item.entity_type === "stop" && item.operation === "delete") {
                    await syncStopDelete(item);
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
                if (isPermanentSyncError(error)) {
                await markSyncQueueItemFailed(item.id, error);
            } 
            else {
                await markSyncQueueItemError(item.id, error);
            }
                if (isUnauthorized(error)) {
                    break;
                }
            }
        }
    } finally {
        isProcessing = false;
    }

    function isPermanentSyncError(error: unknown): boolean {
        return error instanceof ApiError &&
            [400, 403, 404].includes(error.status);
    }
}
