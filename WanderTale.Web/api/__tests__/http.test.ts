import {ApiError, apiFetch} from "@/api/http";

describe("apiFetch", () => {
    const fetchMock = jest.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        global.fetch = fetchMock;
    });

    it("prefixes relative paths with the configured API URL and parses JSON", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            text: async () => JSON.stringify([{id: "trip-1", title: "Tokyo"}]),
        });

        const result = await apiFetch<Array<{id: string; title: string}>>("/trips");

        expect(fetchMock).toHaveBeenCalledWith(
            "http://test-api.local/trips",
            expect.objectContaining({signal: expect.any(AbortSignal)})
        );
        expect(result).toEqual([{id: "trip-1", title: "Tokyo"}]);
    });

    it("throws ApiError for non-successful responses", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 404,
            text: async () => "Not found",
        });

        await expect(apiFetch("/missing")).rejects.toMatchObject<ApiError>({
            name: "ApiError",
            message: "Not found",
            status: 404,
            body: "Not found",
        });
    });
});
