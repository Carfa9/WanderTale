import {api_url} from "@/api/config";
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
import {Entry} from "@/types/entry";

async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 4000): Promise<Response> {
    return Promise.race([
        fetch(url, options),
        new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
    ]);
}

export async function getEntries(tripId: string): Promise<Entry[]> {
    const localEntries = await getLocalEntriesByTripId(tripId);
    processPendingSyncQueue().catch((error) => {
        console.log("Entry sync failed in background:", error);
    });

    if (localEntries.length > 0) {
        fetchWithTimeout(`${api_url}/trips/${tripId}/entries`)
            .then(async (response) => {
                const text = await response.text();
                if (!response.ok) throw new Error(text || `HTTP ${response.status}`);

                const serverEntries: Entry[] = text ? JSON.parse(text) : [];
                await upsertEntriesFromServer(tripId, serverEntries);
            })
            .catch((error) => {
                console.log("Using local entries because API failed:", error);
            });

        return localEntries;
    }

    try {
        const response = await fetchWithTimeout(`${api_url}/trips/${tripId}/entries`);
        const text = await response.text();
        if (!response.ok) throw new Error(text || `HTTP ${response.status}`);

        const serverEntries: Entry[] = text ? JSON.parse(text) : [];
        await upsertEntriesFromServer(tripId, serverEntries);

        return await getLocalEntriesByTripId(tripId);
    } catch (error) {
        console.log("Using local entries because API failed:", error);
        return localEntries;
    }
}

export async function createEntry(tripId: string, dto: CreateEntryDto): Promise<Entry> {
    const localEntry = await insertLocalEntry(tripId, dto);
    await enqueueSyncOperation("entry", localEntry.id, "create", dto);

    processPendingSyncQueue().catch((error) => {
        console.log("Entry saved locally, sync later:", error);
    });

    return localEntry;
}

export async function updateEntry(id: string, dto: CreateEntryDto): Promise<Entry> {
    const localEntry = await updateLocalEntry(id, dto);
    const localId = await getEntryLocalId(id);

    if (localId) {
        await enqueueSyncOperation("entry", localId, "update", dto);
    }

    processPendingSyncQueue().catch((error) => {
        console.log("Entry updated locally, sync later:", error);
    });

    return localEntry;
}

export async function deleteEntry(id: string): Promise<void> {
    const localId = await markLocalEntryDeleted(id);

    if (!localId) return;

    const serverId = await getEntryServerId(localId);

    if (serverId) {
        await enqueueSyncOperation("entry", localId, "delete", {});
    }

    processPendingSyncQueue().catch((error) => {
        console.log("Entry deleted locally, sync later:", error);
    });
}
