import {api_url} from "@/api/config";
import {enqueueSyncOperation} from "@/local/sync-queue";
import {processPendingSyncQueue} from "@/local/sync-engine";
import {
    getLocalTripById,
    getLocalTrips,
    getTripLocalId,
    getTripServerId,
    insertLocalTrip,
    markLocalTripDeleted,
    updateLocalTrip,
    upsertTripsFromServer,
} from "@/local/trips-repo";
import {CreateTripDto, Trip} from "@/types/trip";

async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 4000): Promise<Response> {
    return Promise.race([
        fetch(url, options),
        new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
    ]);
}

export async function getTrips(): Promise<Trip[]> {
    const localTrips = await getLocalTrips();
    processPendingSyncQueue().catch((error) => {
        console.log("Trip sync failed in background:", error);
    });

    try {
        const response = await fetchWithTimeout(`${api_url}/trips`);
        const text = await response.text();

        if (!response.ok) {
            throw new Error(text || `HTTP ${response.status}`);
        }

        const serverTrips: Trip[] = text ? JSON.parse(text) : [];
        await upsertTripsFromServer(serverTrips);

        return await getLocalTrips();
    } catch (error) {
        console.log("Using local trips because API failed:", error);
        return localTrips;
    }
}

export async function getTripById(id: string): Promise<Trip> {
    const localTrip = await getLocalTripById(id);

    if (localTrip) {
        fetchWithTimeout(`${api_url}/trips/${id}`)
            .then(async (response) => {
                const text = await response.text();
                if (!response.ok) throw new Error(text || `HTTP ${response.status}`);

                const serverTrip: Trip = JSON.parse(text);
                await upsertTripsFromServer([serverTrip]);
            })
            .catch((error) => {
                console.log("Using local trip because API failed:", error);
            });

        return localTrip;
    }

    try {
        const response = await fetchWithTimeout(`${api_url}/trips/${id}`);
        const text = await response.text();

        if (!response.ok) throw new Error(text || `HTTP ${response.status}`);

        const serverTrip: Trip = JSON.parse(text);
        await upsertTripsFromServer([serverTrip]);

        return serverTrip;
    } catch (error) {
        throw error;
    }
}

export async function createTrip(dto: CreateTripDto): Promise<Trip> {
    const localTrip = await insertLocalTrip(dto);
    await enqueueSyncOperation("trip", localTrip.id, "create", dto);

    processPendingSyncQueue().catch((error) => {
        console.log("Trip saved locally, sync later:", error);
    });

    return localTrip;
}

export async function updateTrip(id: string, dto: CreateTripDto): Promise<Trip> {
    const localTrip = await updateLocalTrip(id, dto);
    const localId = await getTripLocalId(id);

    if (localId) {
        await enqueueSyncOperation("trip", localId, "update", dto);
    }

    processPendingSyncQueue().catch((error) => {
        console.log("Trip updated locally, sync later:", error);
    });

    return localTrip;
}

export async function deleteTrip(id: string): Promise<void> {
    const localId = await markLocalTripDeleted(id);

    if (!localId) return;

    const serverId = await getTripServerId(localId);

    if (serverId) {
        await enqueueSyncOperation("trip", localId, "delete", {});
    }

    processPendingSyncQueue().catch((error) => {
        console.log("Trip deleted locally, sync later:", error);
    });
}
