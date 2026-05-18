import {api_url} from "@/api/config";
import {enqueueSyncOperation} from "@/local/sync-queue";
import {processPendingSyncQueue} from "@/local/sync-engine";
import {
    getLocalStopsByTripId,
    insertLocalStop,
    upsertStopsFromServer,
} from "@/local/stops-repo";
import {CreateStopDto, Stop} from "@/types/stop";

async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 4000): Promise<Response> {
    return Promise.race([
        fetch(url, options),
        new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
    ]);
}

export async function getStopsByTripId(tripId: string): Promise<Stop[]> {
    const localStops = await getLocalStopsByTripId(tripId);
    processPendingSyncQueue().catch((error) => {
        console.log("Stop sync failed in background:", error);
    });

    if (localStops.length > 0) {
        fetchWithTimeout(`${api_url}/trips/${tripId}/stops`)
            .then(async (response) => {
                const text = await response.text();
                if (!response.ok) throw new Error(text || `HTTP ${response.status}`);

                const serverStops: Stop[] = text ? JSON.parse(text) : [];
                await upsertStopsFromServer(tripId, serverStops);
            })
            .catch((error) => {
                console.log("Using local stops because API failed:", error);
            });

        return localStops;
    }

    try {
        const response = await fetchWithTimeout(`${api_url}/trips/${tripId}/stops`);
        const text = await response.text();

        if (!response.ok) throw new Error(text || `HTTP ${response.status}`);

        const serverStops: Stop[] = text ? JSON.parse(text) : [];
        await upsertStopsFromServer(tripId, serverStops);

        return await getLocalStopsByTripId(tripId);
    } catch (error) {
        console.log("Using local stops because API failed:", error);
        return localStops;
    }
}

export async function createStop(tripId: string, dto: CreateStopDto): Promise<Stop> {
    const localStop = await insertLocalStop(tripId, dto);
    await enqueueSyncOperation("stop", localStop.id, "create", dto);

    processPendingSyncQueue().catch((error) => {
        console.log("Stop saved locally, sync later:", error);
    });

    return localStop;
}
