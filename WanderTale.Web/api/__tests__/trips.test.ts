import {apiFetch} from "@/api/http";
import {createTrip, deleteTrip, getTrips} from "@/api/trips";
import {processPendingSyncQueue} from "@/local/sync-engine";
import {enqueueSyncOperation} from "@/local/sync-queue";
import {
    getLocalTrips,
    getTripServerId,
    insertLocalTrip,
    markLocalTripDeleted,
    upsertTripsFromServer,
} from "@/local/trips-repo";
import {CreateTripDto, Trip} from "@/types/trip";

jest.mock("@/api/http", () => ({
    apiFetch: jest.fn(),
}));

jest.mock("@/local/sync-engine", () => ({
    processPendingSyncQueue: jest.fn(),
}));

jest.mock("@/local/sync-queue", () => ({
    enqueueSyncOperation: jest.fn(),
}));

jest.mock("@/local/trips-repo", () => ({
    getLocalTripById: jest.fn(),
    getLocalTrips: jest.fn(),
    getTripLocalId: jest.fn(),
    getTripServerId: jest.fn(),
    insertLocalTrip: jest.fn(),
    markLocalTripDeleted: jest.fn(),
    updateLocalTrip: jest.fn(),
    upsertTripsFromServer: jest.fn(),
}));

const apiFetchMock = jest.mocked(apiFetch);
const getLocalTripsMock = jest.mocked(getLocalTrips);
const getTripServerIdMock = jest.mocked(getTripServerId);
const enqueueSyncOperationMock = jest.mocked(enqueueSyncOperation);
const insertLocalTripMock = jest.mocked(insertLocalTrip);
const markLocalTripDeletedMock = jest.mocked(markLocalTripDeleted);
const processPendingSyncQueueMock = jest.mocked(processPendingSyncQueue);
const upsertTripsFromServerMock = jest.mocked(upsertTripsFromServer);

const localTrip: Trip = {
    id: "trip_local_1",
    title: "Local trip",
    destination: "Sweden",
    startDate: "2026-04-01T00:00:00.000Z",
    endDate: "2026-04-03T00:00:00.000Z",
    description: "Saved offline",
    travelModes: ["car"],
};

const serverTrip: Trip = {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Server trip",
    destination: "Japan",
    startDate: "2026-05-01T00:00:00.000Z",
    endDate: "2026-05-10T00:00:00.000Z",
    description: "Synced from API",
    travelModes: ["plane"],
};

describe("getTrips", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        processPendingSyncQueueMock.mockResolvedValue(undefined);
        upsertTripsFromServerMock.mockResolvedValue(undefined);
    });

    it("returns local trips when the API request fails", async () => {
        getLocalTripsMock.mockResolvedValueOnce([localTrip]);
        apiFetchMock.mockRejectedValueOnce(new Error("offline"));

        const result = await getTrips();

        expect(result).toEqual([localTrip]);
        expect(processPendingSyncQueueMock).toHaveBeenCalledTimes(1);
        expect(apiFetchMock).toHaveBeenCalledWith("/trips");
        expect(upsertTripsFromServerMock).not.toHaveBeenCalled();
    });

    it("stores server trips locally and returns the refreshed local trips when the API succeeds", async () => {
        getLocalTripsMock
            .mockResolvedValueOnce([localTrip])
            .mockResolvedValueOnce([serverTrip]);
        apiFetchMock.mockResolvedValueOnce([serverTrip]);

        const result = await getTrips();

        expect(result).toEqual([serverTrip]);
        expect(processPendingSyncQueueMock).toHaveBeenCalledTimes(1);
        expect(apiFetchMock).toHaveBeenCalledWith("/trips");
        expect(upsertTripsFromServerMock).toHaveBeenCalledWith([serverTrip]);
        expect(getLocalTripsMock).toHaveBeenCalledTimes(2);
    });
});

describe("createTrip", () => {
    const dto: CreateTripDto = {
        title: "Tokyo",
        destination: "Japan",
        startDate: "2026-05-01T00:00:00.000Z",
        endDate: "2026-05-10T00:00:00.000Z",
        description: "Spring",
        travelModes: ["plane", "train"],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        insertLocalTripMock.mockResolvedValue(localTrip);
        processPendingSyncQueueMock.mockResolvedValue(undefined);
    });

    it("queues create with the local id as clientId", async () => {
        const result = await createTrip(dto);

        expect(result).toEqual(localTrip);
        expect(insertLocalTripMock).toHaveBeenCalledWith(dto);
        expect(enqueueSyncOperationMock).toHaveBeenCalledWith(
            "trip",
            localTrip.id,
            "create",
            {...dto, clientId: localTrip.id}
        );
        expect(processPendingSyncQueueMock).toHaveBeenCalledTimes(1);
    });
});

describe("deleteTrip", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        processPendingSyncQueueMock.mockResolvedValue(undefined);
    });

    it("queues delete for synced trips", async () => {
        markLocalTripDeletedMock.mockResolvedValue("trip_local_1");
        getTripServerIdMock.mockResolvedValue("server_trip_1");

        await deleteTrip("server_trip_1");

        expect(markLocalTripDeletedMock).toHaveBeenCalledWith("server_trip_1");
        expect(enqueueSyncOperationMock).toHaveBeenCalledWith("trip", "trip_local_1", "delete", {});
        expect(processPendingSyncQueueMock).toHaveBeenCalledTimes(1);
    });

    it("does not queue delete when the trip is not found locally", async () => {
        markLocalTripDeletedMock.mockResolvedValue(null);

        await deleteTrip("missing");

        expect(enqueueSyncOperationMock).not.toHaveBeenCalled();
        expect(processPendingSyncQueueMock).not.toHaveBeenCalled();
    });
});
