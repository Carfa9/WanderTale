import {api_url} from "@/api/config";
import {
    getLocalPhotosByTripId,
    getPhotoLocalId,
    getPhotoServerId,
    insertLocalPhoto,
    markLocalPhotoDeleted,
    photoInputFromFormData,
    updateLocalPhotoCaption,
    upsertPhotosFromServer,
} from "@/local/photos-repo";
import {enqueueSyncOperation} from "@/local/sync-queue";
import {processPendingSyncQueue} from "@/local/sync-engine";
import {Photo} from "@/types/photo";

export function resolvePhotoImageUri(imageUri: string): string {
    if (/^(https?:|file:|content:|data:|blob:)/.test(imageUri)) {
        return imageUri;
    }

    return `${api_url}${imageUri}`;
}

export async function createPhoto(tripId: string, formData: FormData): Promise<Photo> {
    const photoInput = photoInputFromFormData(formData);
    const localPhoto = await insertLocalPhoto(tripId, photoInput);
    await enqueueSyncOperation("photo", localPhoto.id, "create", photoInput);

    processPendingSyncQueue().catch((error) => {
        console.log("Photo saved locally, sync later:", error);
    });

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
        const response = await fetch(`${api_url}/photos/${photoServerId}`, {method: "DELETE"});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        if (photoLocalId) {
            await enqueueSyncOperation("photo", photoLocalId, "delete", {});
        }
        console.log("Photo deleted locally, remote delete failed:", error);
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
        const response = await fetch(`${api_url}/photos/${photoServerId}/caption`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({caption}),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        if (photoLocalId) {
            await enqueueSyncOperation("photo", photoLocalId, "updateCaption", {caption});
        }
        console.log("Photo caption updated locally, remote update failed:", error);
    }
}

export async function getPhotos(tripId: string): Promise<Photo[]> {
    const localPhotos = await getLocalPhotosByTripId(tripId);
    processPendingSyncQueue().catch((error) => {
        console.log("Photo sync failed in background:", error);
    });

    try {
        const response = await fetch(`${api_url}/trips/${tripId}/photos`);
        const text = await response.text();

        if (!response.ok) throw new Error(text || `HTTP ${response.status}`);

        const serverPhotos: Photo[] = text ? JSON.parse(text) : [];
        await upsertPhotosFromServer(tripId, serverPhotos);

        return await getLocalPhotosByTripId(tripId);
    } catch (error) {
        console.log("Using local photos because API failed:", error);
        return localPhotos;
    }
}
