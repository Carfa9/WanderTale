import {apiFetch} from "@/api/http";
import {CreateEntryDto} from "@/dto/createEntryDto";
import {
    getLocalEntriesByTripId,
    getEntryLocalId,
    getEntryServerId,
    insertLocalEntry,
    markLocalEntryDeleted,
    updateLocalEntry,
    upsertEntriesFromServer,
} from "@/local/entries-repo";
import {enqueueSyncOperation} from "@/local/sync-queue";
import {processPendingSyncQueue} from "@/local/sync-engine";
import {getTripLocalId, getTripServerId} from "@/local/trips-repo";
import {Entry} from "@/types/entry";

async function getServerTripIdForFetch(tripId: string): Promise<string | null> {
    const localId = await getTripLocalId(tripId);
    if (!localId) return tripId;

    return getTripServerId(localId);
}

export async function getEntries(tripId: string): Promise<Entry[]> {
    const localEntries = await getLocalEntriesByTripId(tripId);

    try {
        await processPendingSyncQueue();
    } catch {
        return localEntries;
    }

    const serverTripId = await getServerTripIdForFetch(tripId);

    if (localEntries.length > 0) {
        if (serverTripId) {
            apiFetch<Entry[]>(`/trips/${serverTripId}/entries`)
                .then(async (serverEntries) => {
                    await upsertEntriesFromServer(tripId, serverEntries);
                })
                .catch(() => {});
        }

        return localEntries;
    }

    if (!serverTripId) return localEntries;

    try {
        const serverEntries = await apiFetch<Entry[]>(`/trips/${serverTripId}/entries`);
        await upsertEntriesFromServer(tripId, serverEntries);

        return await getLocalEntriesByTripId(tripId);
    } catch {
        return localEntries;
    }
}

export async function createEntry(tripId: string, dto: CreateEntryDto): Promise<Entry> {
    const localEntry = await insertLocalEntry(tripId, dto);
    await enqueueSyncOperation("entry", localEntry.id, "create", { ...dto, clientId: localEntry.id });

    processPendingSyncQueue().catch(() => {});

    return localEntry;
}

export async function updateEntry(id: string, dto: CreateEntryDto): Promise<Entry> {
    const localEntry = await updateLocalEntry(id, dto);
    const localId = await getEntryLocalId(id);

    if (localId) {
        await enqueueSyncOperation("entry", localId, "update", dto);
    }

    processPendingSyncQueue().catch(() => {});

    return localEntry;
}

export async function deleteEntry(id: string): Promise<void> {
    const localId = await markLocalEntryDeleted(id);

    if (!localId) return;

    const serverId = await getEntryServerId(localId);

    if (serverId) {
        await enqueueSyncOperation("entry", localId, "delete", {});
    }

    processPendingSyncQueue().catch(() => {});
}
