import {api_url} from "@/api/config";
import {CreateEntryDto} from "@/dto/createEntryDto";
import {
    getLocalEntriesByTripId,
    insertLocalEntry,
    upsertEntriesFromServer,
} from "@/local/entries-repo";
import {enqueueSyncOperation} from "@/local/sync-queue";
import {processPendingSyncQueue} from "@/local/sync-engine";
import {Entry} from "@/types/entry";

export async function getEntries(tripId: string): Promise<Entry[]> {
    const localEntries = await getLocalEntriesByTripId(tripId);
    processPendingSyncQueue().catch((error) => {
        console.log("Entry sync failed in background:", error);
    });

    try {
        const response = await fetch(`${api_url}/trips/${tripId}/entries`);
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
