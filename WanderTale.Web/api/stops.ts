import {apiFetch} from "@/api/http";
import {enqueueSyncOperation} from "@/local/sync-queue";
import {processPendingSyncQueue} from "@/local/sync-engine";
import {
    getLocalStopsByTripId,
    insertLocalStop,
    upsertStopsFromServer,
} from "@/local/stops-repo";
import {getTripLocalId, getTripServerId} from "@/local/trips-repo";
import {CreateStopDto, Stop} from "@/types/stop";

async function getServerTripIdForFetch(tripId: string): Promise<string | null> {
    const localId = await getTripLocalId(tripId);
    if (!localId) return tripId;

    return getTripServerId(localId);
}

export async function getStopsByTripId(tripId: string): Promise<Stop[]> {
    const localStops = await getLocalStopsByTripId(tripId);
    processPendingSyncQueue().catch(() => {});

    const serverTripId = await getServerTripIdForFetch(tripId);

    if (localStops.length > 0) {
        if (serverTripId) {
            apiFetch<Stop[]>(`/trips/${serverTripId}/stops`)
                .then(async (serverStops) => {
                    await upsertStopsFromServer(tripId, serverStops);
                })
                .catch(() => {});
        }

        return localStops;
    }

    if (!serverTripId) return localStops;

    try {
        const serverStops = await apiFetch<Stop[]>(`/trips/${serverTripId}/stops`);
        await upsertStopsFromServer(tripId, serverStops);

        return await getLocalStopsByTripId(tripId);
    } catch {
        return localStops;
    }
}

export async function createStop(tripId: string, dto: CreateStopDto): Promise<Stop> {
    const localStop = await insertLocalStop(tripId, dto);
    await enqueueSyncOperation("stop", localStop.id, "create", {...dto, clientId: localStop.id});

    processPendingSyncQueue().catch(() => {});

    return localStop;
}
