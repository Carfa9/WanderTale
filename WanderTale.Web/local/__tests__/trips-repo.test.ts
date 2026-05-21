import {
    markLocalTripDeleteSynced,
    replaceTripTravelModes,
    upsertTripFromServer,
} from "@/local/trips-repo";
import {getDB} from "@/local/db";
import {Trip} from "@/types/trip";

jest.mock("@/local/db", () => ({
    getDB: jest.fn(),
}));

const getDBMock = jest.mocked(getDB);

function createDb() {
    const db = {
        getFirstAsync: jest.fn(),
        getAllAsync: jest.fn(),
        runAsync: jest.fn(),
        withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => callback()),
    };
    return db;
}

const serverTrip: Trip = {
    id: "server_trip_1",
    clientId: "trip_local_1",
    title: "Tokyo",
    destination: "Japan",
    startDate: "2026-05-01T00:00:00.000Z",
    endDate: "2026-05-10T00:00:00.000Z",
    description: "Spring",
    travelModes: ["plane", "train"],
};

describe("trips-repo sync behavior", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-05-21T10:00:00.000Z");
        jest.spyOn(Date, "now").mockReturnValue(1000);
        jest.spyOn(Math, "random").mockReturnValue(0.123456789);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("keeps a tombstone when a trip delete has synced", async () => {
        const db = createDb();
        getDBMock.mockResolvedValue(db as never);

        await markLocalTripDeleteSynced("trip_local_1", "server_trip_1");

        expect(db.runAsync).toHaveBeenCalledWith(
            expect.stringContaining("SET server_id = COALESCE(server_id, ?)"),
            ["server_trip_1", "2026-05-21T10:00:00.000Z", "trip_local_1"]
        );
        expect(db.runAsync.mock.calls[0][0]).toContain("deleted_at IS NOT NULL");
    });

    it("ignores server trips that match an existing deleted local row", async () => {
        const db = createDb();
        db.getFirstAsync.mockResolvedValueOnce({
            local_id: "trip_local_1",
            server_id: "server_trip_1",
            sync_status: "synced",
            deleted_at: "2026-05-21T09:00:00.000Z",
        });
        getDBMock.mockResolvedValue(db as never);

        await upsertTripFromServer(serverTrip);

        expect(db.withTransactionAsync).not.toHaveBeenCalled();
        expect(db.runAsync).not.toHaveBeenCalled();
    });

    it("ignores old server duplicates that match a deleted trip signature", async () => {
        const db = createDb();
        db.getFirstAsync
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({local_id: "deleted_trip_local_1"});
        getDBMock.mockResolvedValue(db as never);

        await upsertTripFromServer({...serverTrip, clientId: null});

        expect(db.getFirstAsync).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining("WHERE deleted_at IS NOT NULL"),
            [
                "Tokyo",
                "Japan",
                "2026-05-01T00:00:00.000Z",
                "2026-05-10T00:00:00.000Z",
            ]
        );
        expect(db.withTransactionAsync).not.toHaveBeenCalled();
    });

    it("attaches a pending local trip to the server id without overwriting local content", async () => {
        const db = createDb();
        db.getFirstAsync.mockResolvedValueOnce({
            local_id: "trip_local_1",
            server_id: null,
            sync_status: "pending",
            deleted_at: null,
        });
        getDBMock.mockResolvedValue(db as never);

        await upsertTripFromServer(serverTrip);

        expect(db.runAsync).toHaveBeenCalledWith(
            expect.stringContaining("SET server_id = ?"),
            ["server_trip_1", "2026-05-21T10:00:00.000Z", "trip_local_1"]
        );
        expect(db.runAsync).toHaveBeenCalledWith(
            expect.stringContaining("DELETE FROM trip_travel_modes"),
            ["trip_local_1"]
        );
    });

    it("deduplicates trip travel modes and uses stable local ids", async () => {
        const db = createDb();
        getDBMock.mockResolvedValue(db as never);

        await replaceTripTravelModes("trip_local_1", ["plane", "plane", "train"], "synced");

        expect(db.runAsync).toHaveBeenCalledTimes(3);
        expect(db.runAsync).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining("INSERT OR REPLACE INTO trip_travel_modes"),
            [
                "trip_mode_trip_local_1_plane",
                "trip_local_1",
                "plane",
                "synced",
                "2026-05-21T10:00:00.000Z",
                "2026-05-21T10:00:00.000Z",
            ]
        );
        expect(db.runAsync).toHaveBeenNthCalledWith(
            3,
            expect.stringContaining("INSERT OR REPLACE INTO trip_travel_modes"),
            [
                "trip_mode_trip_local_1_train",
                "trip_local_1",
                "train",
                "synced",
                "2026-05-21T10:00:00.000Z",
                "2026-05-21T10:00:00.000Z",
            ]
        );
    });
});
