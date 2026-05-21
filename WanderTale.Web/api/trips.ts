import {apiFetch} from "@/api/http";
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

export async function getTrips(): Promise<Trip[]> {
    const localTrips = await getLocalTrips();

    try {
        await processPendingSyncQueue();
    } catch {
        return localTrips;
    }

    try {
        const serverTrips = await apiFetch<Trip[]>("/trips");
        await upsertTripsFromServer(serverTrips);

        return await getLocalTrips();
    } catch {
        return localTrips;
    }
}

export async function getTripById(id: string): Promise<Trip> {
    const localTrip = await getLocalTripById(id);

    if (localTrip) {
        return localTrip;
    }

    const serverTrip = await apiFetch<Trip>(`/trips/${id}`);
    await upsertTripsFromServer([serverTrip]);

    return serverTrip;
}

export async function createTrip(dto: CreateTripDto): Promise<Trip> {
    const localTrip = await insertLocalTrip(dto);
    await enqueueSyncOperation("trip", localTrip.id, "create", {...dto, clientId: localTrip.id});

    processPendingSyncQueue().catch(() => {});

    return localTrip;
}

export async function updateTrip(id: string, dto: CreateTripDto): Promise<Trip> {
    const localTrip = await updateLocalTrip(id, dto);
    const localId = await getTripLocalId(id);

    if (localId) {
        await enqueueSyncOperation("trip", localId, "update", dto);
    }

    processPendingSyncQueue().catch(() => {});

    return localTrip;
}

export async function deleteTrip(id: string): Promise<void> {
    const localId = await markLocalTripDeleted(id);

    if (!localId) return;

    const serverId = await getTripServerId(localId);

    if (serverId) {
        await enqueueSyncOperation("trip", localId, "delete", {});
    }

    processPendingSyncQueue().catch(() => {});
}
