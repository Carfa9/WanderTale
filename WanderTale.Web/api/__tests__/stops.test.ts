import {apiFetch} from "@/api/http";
import {createStop, deleteStop, getStopsByTripId, updateStop} from "@/api/stops";
import {processPendingSyncQueue} from "@/local/sync-engine";
import {enqueueSyncOperation} from "@/local/sync-queue";
import {
    getStopLocalId,
    getStopServerId,
    getLocalStopsByTripId,
    insertLocalStop,
    markLocalStopDeleted,
    updateLocalStop,
    upsertStopsFromServer,
} from "@/local/stops-repo";
import {getTripLocalId, getTripServerId} from "@/local/trips-repo";
import {CreateStopDto, Stop} from "@/types/stop";

jest.mock("@/api/http", () => ({
    apiFetch: jest.fn(),
}));

jest.mock("@/local/sync-engine", () => ({
    processPendingSyncQueue: jest.fn(),
}));

jest.mock("@/local/sync-queue", () => ({
    enqueueSyncOperation: jest.fn(),
}));

jest.mock("@/local/stops-repo", () => ({
    getStopLocalId: jest.fn(),
    getStopServerId: jest.fn(),
    getLocalStopsByTripId: jest.fn(),
    insertLocalStop: jest.fn(),
    markLocalStopDeleted: jest.fn(),
    updateLocalStop: jest.fn(),
    upsertStopsFromServer: jest.fn(),
}));

jest.mock("@/local/trips-repo", () => ({
    getTripLocalId: jest.fn(),
    getTripServerId: jest.fn(),
}));

const apiFetchMock = jest.mocked(apiFetch);
const enqueueSyncOperationMock = jest.mocked(enqueueSyncOperation);
const getLocalStopsByTripIdMock = jest.mocked(getLocalStopsByTripId);
const getStopLocalIdMock = jest.mocked(getStopLocalId);
const getStopServerIdMock = jest.mocked(getStopServerId);
const getTripLocalIdMock = jest.mocked(getTripLocalId);
const getTripServerIdMock = jest.mocked(getTripServerId);
const insertLocalStopMock = jest.mocked(insertLocalStop);
const markLocalStopDeletedMock = jest.mocked(markLocalStopDeleted);
const processPendingSyncQueueMock = jest.mocked(processPendingSyncQueue);
const updateLocalStopMock = jest.mocked(updateLocalStop);
const upsertStopsFromServerMock = jest.mocked(upsertStopsFromServer);

const localStop: Stop = {
    id: "stop_local_1",
    clientId: "stop_local_1",
    tripId: "trip_local_1",
    title: "Kyoto",
    description: "Temple day",
    startDate: "2026-05-02T00:00:00.000Z",
    endDate: "2026-05-03T00:00:00.000Z",
    country: "Japan",
    orderIndex: 1,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    travelModes: ["train"],
};

const serverStop: Stop = {
    ...localStop,
    id: "server_stop_1",
    tripId: "server_trip_1",
};

describe("getStopsByTripId", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        processPendingSyncQueueMock.mockResolvedValue(undefined);
        upsertStopsFromServerMock.mockResolvedValue(undefined);
    });

    it("returns local stops immediately and refreshes from the server in the background", async () => {
        getLocalStopsByTripIdMock.mockResolvedValueOnce([localStop]);
        getTripLocalIdMock.mockResolvedValueOnce("trip_local_1");
        getTripServerIdMock.mockResolvedValueOnce("server_trip_1");
        apiFetchMock.mockResolvedValueOnce([serverStop]);

        const result = await getStopsByTripId("trip_local_1");
        await Promise.resolve();

        expect(result).toEqual([localStop]);
        expect(processPendingSyncQueueMock).toHaveBeenCalledTimes(1);
        expect(apiFetchMock).toHaveBeenCalledWith("/trips/server_trip_1/stops");
        expect(upsertStopsFromServerMock).toHaveBeenCalledWith("trip_local_1", [serverStop]);
    });

    it("fetches server stops when there are no local stops", async () => {
        getLocalStopsByTripIdMock
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([serverStop]);
        getTripLocalIdMock.mockResolvedValueOnce("trip_local_1");
        getTripServerIdMock.mockResolvedValueOnce("server_trip_1");
        apiFetchMock.mockResolvedValueOnce([serverStop]);

        const result = await getStopsByTripId("trip_local_1");

        expect(result).toEqual([serverStop]);
        expect(upsertStopsFromServerMock).toHaveBeenCalledWith("trip_local_1", [serverStop]);
        expect(getLocalStopsByTripIdMock).toHaveBeenCalledTimes(2);
    });

    it("returns local stops when the trip has no server id yet", async () => {
        getLocalStopsByTripIdMock.mockResolvedValueOnce([]);
        getTripLocalIdMock.mockResolvedValueOnce("trip_local_1");
        getTripServerIdMock.mockResolvedValueOnce(null);

        const result = await getStopsByTripId("trip_local_1");

        expect(result).toEqual([]);
        expect(apiFetchMock).not.toHaveBeenCalled();
    });
});

describe("createStop", () => {
    const dto: CreateStopDto = {
        title: "Kyoto",
        description: "Temple day",
        startDate: "2026-05-02T00:00:00.000Z",
        endDate: "2026-05-03T00:00:00.000Z",
        country: "Japan",
        travelModes: ["train"],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        insertLocalStopMock.mockResolvedValue(localStop);
        processPendingSyncQueueMock.mockResolvedValue(undefined);
    });

    it("queues create with the local stop id as clientId", async () => {
        const result = await createStop("trip_local_1", dto);

        expect(result).toEqual(localStop);
        expect(insertLocalStopMock).toHaveBeenCalledWith("trip_local_1", dto);
        expect(enqueueSyncOperationMock).toHaveBeenCalledWith(
            "stop",
            localStop.id,
            "create",
            {...dto, clientId: localStop.id}
        );
        expect(processPendingSyncQueueMock).toHaveBeenCalledTimes(1);
    });
});

describe("updateStop", () => {
    const dto: CreateStopDto = {
        title: "Osaka",
        description: "Food day",
        startDate: "2026-05-04T00:00:00.000Z",
        endDate: "2026-05-05T00:00:00.000Z",
        country: "Japan",
        travelModes: ["train"],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        updateLocalStopMock.mockResolvedValue({...localStop, ...dto});
        getStopLocalIdMock.mockResolvedValue("stop_local_1");
        processPendingSyncQueueMock.mockResolvedValue(undefined);
    });

    it("updates locally and queues a stop update", async () => {
        const result = await updateStop("server_stop_1", dto);

        expect(result.title).toBe("Osaka");
        expect(updateLocalStopMock).toHaveBeenCalledWith("server_stop_1", dto);
        expect(getStopLocalIdMock).toHaveBeenCalledWith("server_stop_1");
        expect(enqueueSyncOperationMock).toHaveBeenCalledWith("stop", "stop_local_1", "update", dto);
        expect(processPendingSyncQueueMock).toHaveBeenCalledTimes(1);
    });
});

describe("deleteStop", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        processPendingSyncQueueMock.mockResolvedValue(undefined);
    });

    it("marks the stop deleted and queues delete when it has a server id", async () => {
        markLocalStopDeletedMock.mockResolvedValue("stop_local_1");
        getStopServerIdMock.mockResolvedValue("server_stop_1");

        await deleteStop("server_stop_1");

        expect(markLocalStopDeletedMock).toHaveBeenCalledWith("server_stop_1");
        expect(getStopServerIdMock).toHaveBeenCalledWith("stop_local_1");
        expect(enqueueSyncOperationMock).toHaveBeenCalledWith("stop", "stop_local_1", "delete", {});
        expect(processPendingSyncQueueMock).toHaveBeenCalledTimes(1);
    });

    it("does not queue delete for an unsynced local stop", async () => {
        markLocalStopDeletedMock.mockResolvedValue("stop_local_1");
        getStopServerIdMock.mockResolvedValue(null);

        await deleteStop("stop_local_1");

        expect(enqueueSyncOperationMock).not.toHaveBeenCalled();
        expect(processPendingSyncQueueMock).toHaveBeenCalledTimes(1);
    });
});
