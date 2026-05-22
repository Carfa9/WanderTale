import {
    getSoftDeletedLocalStopId,
    hardDeleteLocalStop,
    markLocalStopDeleted,
    replaceStopTravelModes,
    updateLocalStop,
    upsertStopFromServer,
} from "@/local/stops-repo";
import {getDB} from "@/local/db";
import {getTripLocalId} from "@/local/trips-repo";
import {Stop} from "@/types/stop";

jest.mock("@/local/db", () => ({
    getDB: jest.fn(),
}));

jest.mock("@/local/trips-repo", () => ({
    getTripLocalId: jest.fn(),
}));

const getDBMock = jest.mocked(getDB);
const getTripLocalIdMock = jest.mocked(getTripLocalId);

function createDb() {
    return {
        getFirstAsync: jest.fn(),
        getAllAsync: jest.fn(),
        runAsync: jest.fn(),
        withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => callback()),
    };
}

const serverStop: Stop = {
    id: "server_stop_1",
    clientId: "stop_local_1",
    tripId: "server_trip_1",
    title: "Kyoto",
    description: "Temple day",
    startDate: "2026-05-02T00:00:00.000Z",
    endDate: "2026-05-03T00:00:00.000Z",
    country: "Japan",
    orderIndex: 1,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    travelModes: ["train", "train", "bike"],
};

describe("stops-repo sync behavior", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-05-21T10:00:00.000Z");
        jest.spyOn(Date, "now").mockReturnValue(1000);
        jest.spyOn(Math, "random").mockReturnValue(0.123456789);
        getTripLocalIdMock.mockResolvedValue("trip_local_1");
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("matches server stops back to local rows by clientId", async () => {
        const db = createDb();
        db.getFirstAsync.mockResolvedValueOnce({local_id: "stop_local_1"});
        getDBMock.mockResolvedValue(db as never);

        await upsertStopFromServer("trip_local_1", serverStop);

        expect(db.getFirstAsync).toHaveBeenCalledWith(
            expect.stringContaining("WHERE server_id = ? OR local_id = ? OR local_id = ?"),
            ["server_stop_1", "server_stop_1", "stop_local_1"]
        );
        expect(db.runAsync).toHaveBeenCalledWith(
            expect.stringContaining("ON CONFLICT(local_id) DO UPDATE SET"),
            expect.arrayContaining(["stop_local_1", "server_stop_1", "trip_local_1"])
        );
    });

    it("creates a new local stop when no server/client match exists", async () => {
        const db = createDb();
        db.getFirstAsync.mockResolvedValueOnce(null);
        getDBMock.mockResolvedValue(db as never);

        await upsertStopFromServer("trip_local_1", {...serverStop, clientId: null});

        expect(db.runAsync.mock.calls[0][1][0]).toBe("stop_1000_4fzzzxjy");
        expect(db.runAsync.mock.calls[0][1][1]).toBe("server_stop_1");
    });

    it("throws when the parent trip cannot be found locally", async () => {
        const db = createDb();
        getDBMock.mockResolvedValue(db as never);
        getTripLocalIdMock.mockResolvedValueOnce(null);

        await expect(upsertStopFromServer("missing_trip", serverStop)).rejects.toThrow(
            "Trip not found locally: missing_trip"
        );
        expect(db.runAsync).not.toHaveBeenCalled();
    });

    it("updates a local stop and marks it pending for sync", async () => {
        const db = createDb();
        db.getFirstAsync
            .mockResolvedValueOnce({local_id: "stop_local_1"})
            .mockResolvedValueOnce({
                local_id: "stop_local_1",
                server_id: "server_stop_1",
                trip_local_id: "trip_local_1",
                trip_server_id: "server_trip_1",
                title: "Kyoto",
                description: "Temple day",
                start_date: "2026-05-02T00:00:00.000Z",
                end_date: "2026-05-03T00:00:00.000Z",
                country: "Japan",
                order_index: 1,
                created_at: "2026-05-01T00:00:00.000Z",
                updated_at: "2026-05-01T00:00:00.000Z",
            });
        getDBMock.mockResolvedValue(db as never);

        const updated = await updateLocalStop("server_stop_1", {
            title: "Osaka",
            description: "Food day",
            startDate: "2026-05-04T00:00:00.000Z",
            endDate: "2026-05-05T00:00:00.000Z",
            country: "Japan",
            travelModes: ["train", "bike"],
        });

        expect(db.getFirstAsync).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining("AND (local_id = ? OR server_id = ?)"),
            ["server_stop_1", "server_stop_1"]
        );
        expect(db.runAsync).toHaveBeenCalledWith(
            expect.stringContaining("sync_status = 'pending'"),
            [
                "Osaka",
                "Food day",
                "2026-05-04T00:00:00.000Z",
                "2026-05-05T00:00:00.000Z",
                "Japan",
                "2026-05-21T10:00:00.000Z",
                "stop_local_1",
            ]
        );
        expect(updated).toEqual({
            id: "server_stop_1",
            clientId: "stop_local_1",
            tripId: "server_trip_1",
            title: "Osaka",
            description: "Food day",
            startDate: "2026-05-04T00:00:00.000Z",
            endDate: "2026-05-05T00:00:00.000Z",
            country: "Japan",
            orderIndex: 1,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-21T10:00:00.000Z",
            travelModes: ["train", "bike"],
        });
    });

    it("throws when updating a missing local stop", async () => {
        const db = createDb();
        db.getFirstAsync.mockResolvedValueOnce(null);
        getDBMock.mockResolvedValue(db as never);

        await expect(updateLocalStop("missing_stop", {
            title: "Missing",
            description: null,
            startDate: null,
            endDate: null,
            country: null,
            travelModes: [],
        })).rejects.toThrow("Stop not found locally: missing_stop");
        expect(db.runAsync).not.toHaveBeenCalled();
    });

    it("marks a local stop deleted for sync", async () => {
        const db = createDb();
        db.getFirstAsync.mockResolvedValueOnce({local_id: "stop_local_1"});
        getDBMock.mockResolvedValue(db as never);

        const localId = await markLocalStopDeleted("server_stop_1");

        expect(localId).toBe("stop_local_1");
        expect(db.runAsync).toHaveBeenCalledWith(
            expect.stringContaining("SET deleted_at = ?"),
            [
                "2026-05-21T10:00:00.000Z",
                "2026-05-21T10:00:00.000Z",
                "stop_local_1",
            ]
        );
    });

    it("hard deletes a local stop", async () => {
        const db = createDb();
        getDBMock.mockResolvedValue(db as never);

        await hardDeleteLocalStop("stop_local_1");

        expect(db.runAsync).toHaveBeenCalledWith(
            "DELETE FROM stops WHERE local_id = ?",
            ["stop_local_1"]
        );
    });

    it("finds soft deleted local stops", async () => {
        const db = createDb();
        db.getFirstAsync.mockResolvedValueOnce({local_id: "stop_local_1"});
        getDBMock.mockResolvedValue(db as never);

        const localId = await getSoftDeletedLocalStopId("stop_local_1");

        expect(localId).toBe("stop_local_1");
        expect(db.getFirstAsync).toHaveBeenCalledWith(
            expect.stringContaining("deleted_at IS NOT NULL"),
            ["stop_local_1"]
        );
    });

    it("does not overwrite pending local stops when upserting from the server", async () => {
        const db = createDb();
        db.getFirstAsync.mockResolvedValueOnce({
            local_id: "stop_local_1",
            server_id: "server_stop_1",
            sync_status: "pending",
            deleted_at: null,
        });
        getDBMock.mockResolvedValue(db as never);

        await upsertStopFromServer("trip_local_1", serverStop);

        expect(db.withTransactionAsync).not.toHaveBeenCalled();
        expect(db.runAsync).not.toHaveBeenCalled();
    });

    it("deduplicates stop travel modes and uses stable local ids", async () => {
        const db = createDb();
        getDBMock.mockResolvedValue(db as never);

        await replaceStopTravelModes("stop_local_1", ["train", "train", "bike"], "synced");

        expect(db.runAsync).toHaveBeenCalledTimes(3);
        expect(db.runAsync).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining("INSERT OR REPLACE INTO stop_travel_modes"),
            [
                "stop_mode_stop_local_1_train",
                "stop_local_1",
                "train",
                "synced",
                "2026-05-21T10:00:00.000Z",
                "2026-05-21T10:00:00.000Z",
            ]
        );
        expect(db.runAsync).toHaveBeenNthCalledWith(
            3,
            expect.stringContaining("INSERT OR REPLACE INTO stop_travel_modes"),
            [
                "stop_mode_stop_local_1_bike",
                "stop_local_1",
                "bike",
                "synced",
                "2026-05-21T10:00:00.000Z",
                "2026-05-21T10:00:00.000Z",
            ]
        );
    });
});
