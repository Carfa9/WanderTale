import {apiFetch, ApiError} from "@/api/http";
import {processPendingSyncQueue} from "@/local/sync-engine";
import {
    getPendingSyncQueue,
    markSyncQueueItemError,
    markSyncQueueItemProcessing,
    markSyncQueueItemSynced,
    SyncQueueItem,
} from "@/local/sync-queue";
import {
    getLocalTripById,
    getSoftDeletedLocalTripId,
    getTripServerId,
    markLocalTripDeleteSynced,
    markLocalTripSynced,
} from "@/local/trips-repo";
import {
    getLocalStopForSync,
    getSoftDeletedLocalStopId,
    getStopServerId,
    hardDeleteLocalStop,
    markLocalStopSynced,
} from "@/local/stops-repo";
import {Trip} from "@/types/trip";
import {Stop} from "@/types/stop";

jest.mock("@/api/http", () => {
    class MockApiError extends Error {
        status: number;
        body: string;

        constructor(message: string, status: number, body: string) {
            super(message);
            this.name = "ApiError";
            this.status = status;
            this.body = body;
        }
    }

    return {
        ApiError: MockApiError,
        apiFetch: jest.fn(),
    };
});

jest.mock("@/local/sync-queue", () => ({
    getPendingSyncQueue: jest.fn(),
    markSyncQueueItemError: jest.fn(),
    markSyncQueueItemProcessing: jest.fn(),
    markSyncQueueItemSynced: jest.fn(),
}));

jest.mock("@/local/trips-repo", () => ({
    getLocalTripById: jest.fn(),
    getSoftDeletedLocalTripId: jest.fn(),
    getTripServerId: jest.fn(),
    markLocalTripDeleteSynced: jest.fn(),
    markLocalTripSynced: jest.fn(),
}));

jest.mock("@/local/stops-repo", () => ({
    getLocalStopForSync: jest.fn(),
    getSoftDeletedLocalStopId: jest.fn(),
    getStopServerId: jest.fn(),
    hardDeleteLocalStop: jest.fn(),
    markLocalStopSynced: jest.fn(),
}));

jest.mock("@/local/entries-repo", () => ({
    getEntryServerId: jest.fn(),
    getLocalEntryForSync: jest.fn(),
    getSoftDeletedLocalEntryId: jest.fn(),
    hardDeleteLocalEntry: jest.fn(),
    markLocalEntrySynced: jest.fn(),
}));

jest.mock("@/local/photos-repo", () => ({
    getLocalPhotoForSync: jest.fn(),
    getPhotoServerId: jest.fn(),
    getSoftDeletedLocalPhotoId: jest.fn(),
    hardDeleteLocalPhoto: jest.fn(),
    markLocalPhotoSynced: jest.fn(),
}));

const apiFetchMock = jest.mocked(apiFetch);
const getLocalStopForSyncMock = jest.mocked(getLocalStopForSync);
const getSoftDeletedLocalStopIdMock = jest.mocked(getSoftDeletedLocalStopId);
const getLocalTripByIdMock = jest.mocked(getLocalTripById);
const getPendingSyncQueueMock = jest.mocked(getPendingSyncQueue);
const getSoftDeletedLocalTripIdMock = jest.mocked(getSoftDeletedLocalTripId);
const getStopServerIdMock = jest.mocked(getStopServerId);
const getTripServerIdMock = jest.mocked(getTripServerId);
const markLocalStopSyncedMock = jest.mocked(markLocalStopSynced);
const hardDeleteLocalStopMock = jest.mocked(hardDeleteLocalStop);
const markLocalTripDeleteSyncedMock = jest.mocked(markLocalTripDeleteSynced);
const markLocalTripSyncedMock = jest.mocked(markLocalTripSynced);
const markSyncQueueItemErrorMock = jest.mocked(markSyncQueueItemError);
const markSyncQueueItemProcessingMock = jest.mocked(markSyncQueueItemProcessing);
const markSyncQueueItemSyncedMock = jest.mocked(markSyncQueueItemSynced);

const localTrip: Trip = {
    id: "trip_local_1",
    clientId: "trip_local_1",
    title: "Tokyo",
    destination: "Japan",
    startDate: "2026-05-01T00:00:00.000Z",
    endDate: "2026-05-10T00:00:00.000Z",
    description: "Spring",
    travelModes: ["plane"],
};

const serverTrip: Trip = {
    ...localTrip,
    id: "server_trip_1",
};

const serverStop: Stop = {
    id: "server_stop_1",
    clientId: "stop_local_1",
    tripId: "server_trip_1",
    title: "Kyoto",
    description: null,
    startDate: null,
    endDate: null,
    country: "Japan",
    orderIndex: 1,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    travelModes: ["train"],
};

function queueItem(overrides: Partial<SyncQueueItem>): SyncQueueItem {
    return {
        id: "sync_1",
        entity_type: "trip",
        entity_local_id: "trip_local_1",
        operation: "create",
        payload: JSON.stringify({title: "Tokyo", travelModes: ["plane"]}),
        status: "pending",
        attempts: 0,
        last_error: null,
        ...overrides,
    };
}

describe("processPendingSyncQueue", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        markSyncQueueItemProcessingMock.mockResolvedValue(undefined);
        markSyncQueueItemSyncedMock.mockResolvedValue(undefined);
        markSyncQueueItemErrorMock.mockResolvedValue(undefined);
        markLocalTripSyncedMock.mockResolvedValue(undefined);
        markLocalTripDeleteSyncedMock.mockResolvedValue(undefined);
        markLocalStopSyncedMock.mockResolvedValue(undefined);
        hardDeleteLocalStopMock.mockResolvedValue(undefined);
        getSoftDeletedLocalTripIdMock.mockResolvedValue(null);
        getSoftDeletedLocalStopIdMock.mockResolvedValue(null);
        getStopServerIdMock.mockResolvedValue(null);
    });

    it("creates trips with a stable clientId and marks the local trip synced", async () => {
        getPendingSyncQueueMock.mockResolvedValueOnce([
            queueItem({
                payload: JSON.stringify({
                    title: "Tokyo",
                    destination: "Japan",
                    travelModes: ["plane"],
                }),
            }),
        ]);
        getLocalTripByIdMock.mockResolvedValueOnce(localTrip);
        getTripServerIdMock.mockResolvedValueOnce(null);
        apiFetchMock.mockResolvedValueOnce(serverTrip);

        await processPendingSyncQueue();

        expect(markSyncQueueItemProcessingMock).toHaveBeenCalledWith("sync_1");
        expect(apiFetchMock).toHaveBeenCalledWith("/trips", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                title: "Tokyo",
                destination: "Japan",
                travelModes: ["plane"],
                clientId: "trip_local_1",
            }),
        });
        expect(markLocalTripSyncedMock).toHaveBeenCalledWith("trip_local_1", serverTrip);
        expect(markSyncQueueItemSyncedMock).toHaveBeenCalledWith("sync_1");
    });

    it("does not post trip creates that already have a server id", async () => {
        getPendingSyncQueueMock.mockResolvedValueOnce([queueItem({})]);
        getLocalTripByIdMock.mockResolvedValueOnce(localTrip);
        getTripServerIdMock.mockResolvedValueOnce("server_trip_1");

        await processPendingSyncQueue();

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(markLocalTripSyncedMock).not.toHaveBeenCalled();
        expect(markSyncQueueItemSyncedMock).toHaveBeenCalledWith("sync_1");
    });

    it("keeps a trip tombstone after a synced delete", async () => {
        getPendingSyncQueueMock.mockResolvedValueOnce([
            queueItem({
                operation: "delete",
                payload: "{}",
            }),
        ]);
        getTripServerIdMock.mockResolvedValueOnce("server_trip_1");
        apiFetchMock.mockResolvedValueOnce(undefined);

        await processPendingSyncQueue();

        expect(apiFetchMock).toHaveBeenCalledWith("/trips/server_trip_1", {method: "DELETE"});
        expect(markLocalTripDeleteSyncedMock).toHaveBeenCalledWith("trip_local_1", "server_trip_1");
        expect(markSyncQueueItemSyncedMock).toHaveBeenCalledWith("sync_1");
    });

    it("treats 404 deletes as already deleted and keeps the tombstone", async () => {
        getPendingSyncQueueMock.mockResolvedValueOnce([
            queueItem({
                operation: "delete",
                payload: "{}",
            }),
        ]);
        getTripServerIdMock.mockResolvedValueOnce("server_trip_1");
        apiFetchMock.mockRejectedValueOnce(new ApiError("Not found", 404, "Not found"));

        await processPendingSyncQueue();

        expect(markSyncQueueItemErrorMock).not.toHaveBeenCalled();
        expect(markLocalTripDeleteSyncedMock).toHaveBeenCalledWith("trip_local_1", "server_trip_1");
        expect(markSyncQueueItemSyncedMock).toHaveBeenCalledWith("sync_1");
    });

    it("creates stops with a stable clientId", async () => {
        getPendingSyncQueueMock.mockResolvedValueOnce([
            queueItem({
                entity_type: "stop",
                entity_local_id: "stop_local_1",
                payload: JSON.stringify({
                    title: "Kyoto",
                    country: "Japan",
                    travelModes: ["train"],
                }),
            }),
        ]);
        getLocalStopForSyncMock.mockResolvedValueOnce({
            stop: {...serverStop, id: "stop_local_1", tripId: "trip_local_1"},
            tripLocalId: "trip_local_1",
        });
        getTripServerIdMock.mockResolvedValueOnce("server_trip_1");
        apiFetchMock.mockResolvedValueOnce(serverStop);

        await processPendingSyncQueue();

        expect(apiFetchMock).toHaveBeenCalledWith("/trips/server_trip_1/stops", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                title: "Kyoto",
                country: "Japan",
                travelModes: ["train"],
                clientId: "stop_local_1",
            }),
        });
        expect(markLocalStopSyncedMock).toHaveBeenCalledWith("stop_local_1", serverStop);
        expect(markSyncQueueItemSyncedMock).toHaveBeenCalledWith("sync_1");
    });

    it("updates stops through the stop endpoint", async () => {
        getPendingSyncQueueMock.mockResolvedValueOnce([
            queueItem({
                entity_type: "stop",
                entity_local_id: "stop_local_1",
                operation: "update",
                payload: JSON.stringify({
                    title: "Osaka",
                    country: "Japan",
                    travelModes: ["train"],
                }),
            }),
        ]);
        getStopServerIdMock.mockResolvedValueOnce("server_stop_1");
        getLocalStopForSyncMock.mockResolvedValueOnce({
            stop: {...serverStop, id: "server_stop_1", title: "Osaka"},
            tripLocalId: "trip_local_1",
        });
        apiFetchMock.mockResolvedValueOnce({...serverStop, title: "Osaka"});

        await processPendingSyncQueue();

        expect(apiFetchMock).toHaveBeenCalledWith("/stops/server_stop_1", {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                title: "Osaka",
                country: "Japan",
                travelModes: ["train"],
            }),
        });
        expect(markLocalStopSyncedMock).toHaveBeenCalledWith("stop_local_1", {...serverStop, title: "Osaka"});
        expect(markSyncQueueItemSyncedMock).toHaveBeenCalledWith("sync_1");
    });

    it("deletes synced stops and hard deletes the local row", async () => {
        getPendingSyncQueueMock.mockResolvedValueOnce([
            queueItem({
                entity_type: "stop",
                entity_local_id: "stop_local_1",
                operation: "delete",
                payload: "{}",
            }),
        ]);
        getStopServerIdMock.mockResolvedValueOnce("server_stop_1");
        apiFetchMock.mockResolvedValueOnce(undefined);

        await processPendingSyncQueue();

        expect(apiFetchMock).toHaveBeenCalledWith("/stops/server_stop_1", {method: "DELETE"});
        expect(hardDeleteLocalStopMock).toHaveBeenCalledWith("stop_local_1");
        expect(markSyncQueueItemSyncedMock).toHaveBeenCalledWith("sync_1");
    });

    it("hard deletes soft-deleted unsynced stops without posting create", async () => {
        getPendingSyncQueueMock.mockResolvedValueOnce([
            queueItem({
                entity_type: "stop",
                entity_local_id: "stop_local_1",
                operation: "create",
            }),
        ]);
        getStopServerIdMock.mockResolvedValueOnce(null);
        getLocalStopForSyncMock.mockResolvedValueOnce(null);
        getSoftDeletedLocalStopIdMock.mockResolvedValueOnce("stop_local_1");

        await processPendingSyncQueue();

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(hardDeleteLocalStopMock).toHaveBeenCalledWith("stop_local_1");
        expect(markSyncQueueItemSyncedMock).toHaveBeenCalledWith("sync_1");
    });

    it("marks queue items as error when sync fails", async () => {
        const error = new Error("offline");
        getPendingSyncQueueMock.mockResolvedValueOnce([queueItem({})]);
        getLocalTripByIdMock.mockResolvedValueOnce(localTrip);
        getTripServerIdMock.mockResolvedValueOnce(null);
        apiFetchMock.mockRejectedValueOnce(error);

        await processPendingSyncQueue();

        expect(markSyncQueueItemErrorMock).toHaveBeenCalledWith("sync_1", error);
        expect(markSyncQueueItemSyncedMock).not.toHaveBeenCalled();
    });
});
