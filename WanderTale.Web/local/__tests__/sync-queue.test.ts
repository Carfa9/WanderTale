import {
    enqueueSyncOperation,
    getPendingSyncQueue,
    markSyncQueueItemError,
    markSyncQueueItemProcessing,
    markSyncQueueItemSynced,
} from "@/local/sync-queue";
import {getDB} from "@/local/db";

jest.mock("@/local/db", () => ({
    getDB: jest.fn(),
}));

const getDBMock = jest.mocked(getDB);

function createDb() {
    return {
        getFirstAsync: jest.fn(),
        getAllAsync: jest.fn(),
        runAsync: jest.fn(),
    };
}

describe("sync-queue", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-05-21T10:00:00.000Z");
        jest.spyOn(Date, "now").mockReturnValue(1000);
        jest.spyOn(Math, "random").mockReturnValue(0.123456789);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("updates an existing active queue item instead of inserting a duplicate", async () => {
        const db = createDb();
        db.getFirstAsync.mockResolvedValueOnce({id: "sync_existing"});
        getDBMock.mockResolvedValue(db as never);

        await enqueueSyncOperation("trip", "trip_local_1", "create", {title: "Tokyo"});

        expect(db.getFirstAsync).toHaveBeenCalledWith(
            expect.stringContaining("status IN ('pending', 'error', 'processing')"),
            ["trip", "trip_local_1", "create", "__anonymous__"]
        );
        expect(db.runAsync).toHaveBeenCalledTimes(1);
        expect(db.runAsync).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE sync_queue"),
            [JSON.stringify({title: "Tokyo"}), "2026-05-21T10:00:00.000Z", "sync_existing"]
        );
    });

    it("inserts a new queue item when no active item exists", async () => {
        const db = createDb();
        db.getFirstAsync.mockResolvedValueOnce(null);
        getDBMock.mockResolvedValue(db as never);

        await enqueueSyncOperation("stop", "stop_local_1", "create", {title: "Kyoto"});

        expect(db.runAsync).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO sync_queue"),
            [
                "sync_1000_4fzzzxjy",
                "stop",
                "stop_local_1",
                "create",
                JSON.stringify({title: "Kyoto"}),
                "2026-05-21T10:00:00.000Z",
                "2026-05-21T10:00:00.000Z",
                "__anonymous__",
            ]
        );
    });

    it("fetches pending and error queue items in created order", async () => {
        const db = createDb();
        db.getAllAsync.mockResolvedValueOnce([{id: "sync_1"}]);
        getDBMock.mockResolvedValue(db as never);

        const result = await getPendingSyncQueue(10);

        expect(result).toEqual([{id: "sync_1"}]);
        expect(db.getAllAsync).toHaveBeenCalledWith(
            expect.stringContaining("status IN ('pending', 'error')"),
            ["__anonymous__", "2026-05-21T10:00:00.000Z", 10]
        );
        expect(db.getAllAsync.mock.calls[0][0]).toContain("ORDER BY created_at ASC");
    });

    it("marks queue item processing and increments attempts", async () => {
        const db = createDb();
        getDBMock.mockResolvedValue(db as never);

        await markSyncQueueItemProcessing("sync_1");

        expect(db.runAsync).toHaveBeenCalledWith(
            expect.stringContaining("attempts   = attempts + 1"),
            ["2026-05-21T10:00:00.000Z", "2026-05-21T10:00:00.000Z", "sync_1"]
        );
    });

    it("marks queue item synced and clears the last error", async () => {
        const db = createDb();
        getDBMock.mockResolvedValue(db as never);

        await markSyncQueueItemSynced("sync_1");

        expect(db.runAsync).toHaveBeenCalledWith(
            expect.stringContaining("last_error = NULL"),
            ["2026-05-21T10:00:00.000Z", "sync_1"]
        );
    });

    it("stores error messages on failed queue items", async () => {
        const db = createDb();
        getDBMock.mockResolvedValue(db as never);

        await markSyncQueueItemError("sync_1", new Error("offline"));

        expect(db.runAsync).toHaveBeenCalledWith(
            expect.stringContaining("last_error = ?"),
            ["offline", "2026-05-21T10:00:00.000Z", "sync_1"]
        );
    });
});
