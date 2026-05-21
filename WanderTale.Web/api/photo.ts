import {api_url} from "@/api/config";
import {apiFetch} from "@/api/http";
import {
    getLocalPhotosByTripId,
    getPhotoLocalId,
    getPhotoServerId,
    hardDeleteLocalPhoto,
    insertLocalPhoto,
    markLocalPhotoDeleted,
    photoInputFromFormData,
    updateLocalPhotoCaption,
    upsertPhotosFromServer,
} from "@/local/photos-repo";
import {enqueueSyncOperation} from "@/local/sync-queue";
import {processPendingSyncQueue} from "@/local/sync-engine";
import {getTripLocalId, getTripServerId} from "@/local/trips-repo";
import {Photo} from "@/types/photo";

export function resolvePhotoImageUri(imageUri: string): string {
    if (/^(https?:|file:|content:|data:|blob:)/.test(imageUri)) {
        return imageUri;
    }

    return `${api_url}${imageUri}`;
}

async function getServerTripIdForFetch(tripId: string): Promise<string | null> {
    const localId = await getTripLocalId(tripId);
    if (!localId) return tripId;

    return getTripServerId(localId);
}

export async function createPhoto(tripId: string, formData: FormData): Promise<Photo> {
    const photoInput = photoInputFromFormData(formData);
    const localPhoto = await insertLocalPhoto(tripId, photoInput);
    await enqueueSyncOperation("photo", localPhoto.id, "create", photoInput);

    processPendingSyncQueue().catch(() => {});

    return localPhoto;
}

export async function deletePhoto(photoId: string): Promise<void> {
    const photoLocalId = await getPhotoLocalId(photoId);
    const photoServerId = photoLocalId ? await getPhotoServerId(photoLocalId) : photoId;

    await markLocalPhotoDeleted(photoId);

    if (!photoServerId) {
        return;
    }

    try {
        await apiFetch<void>(`/photos/${photoServerId}`, {method: "DELETE"});
        if (photoLocalId) {
            await hardDeleteLocalPhoto(photoLocalId);
        }
    } catch {
        if (photoLocalId) {
            await enqueueSyncOperation("photo", photoLocalId, "delete", {});
            processPendingSyncQueue().catch(() => {});
        }
    }
}

export async function updatePhotoCaption(photoId: string, caption: string | null): Promise<void> {
    const photoLocalId = await getPhotoLocalId(photoId);
    const photoServerId = photoLocalId ? await getPhotoServerId(photoLocalId) : photoId;

    await updateLocalPhotoCaption(photoId, caption);

    if (!photoServerId) {
        if (photoLocalId) {
            await enqueueSyncOperation("photo", photoLocalId, "updateCaption", {caption});
        }
        return;
    }

    try {
        await apiFetch<void>(`/photos/${photoServerId}/caption`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({caption}),
        });
    } catch {
        if (photoLocalId) {
            await enqueueSyncOperation("photo", photoLocalId, "updateCaption", {caption});
        }
    }
}

export async function getPhotos(tripId: string): Promise<Photo[]> {
    const localPhotos = await getLocalPhotosByTripId(tripId);

    try {
        await processPendingSyncQueue();
    } catch {
        return localPhotos;
    }

    const serverTripId = await getServerTripIdForFetch(tripId);

    if (localPhotos.length > 0) {
        if (serverTripId) {
            apiFetch<Photo[]>(`/trips/${serverTripId}/photos`)
                .then(async (serverPhotos) => {
                    await upsertPhotosFromServer(tripId, serverPhotos);
                })
                .catch(() => {});
        }

        return localPhotos;
    }

    if (!serverTripId) return localPhotos;

    try {
        const serverPhotos = await apiFetch<Photo[]>(`/trips/${serverTripId}/photos`);
        await upsertPhotosFromServer(tripId, serverPhotos);

        return await getLocalPhotosByTripId(tripId);
    } catch {
        return localPhotos;
    }
}
