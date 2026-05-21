import {FormatDate, SafeDate} from "@/components/format-date";

describe("format-date", () => {
    it("returns null for empty or invalid dates", () => {
        expect(SafeDate(null)).toBeNull();
        expect(SafeDate("not-a-date")).toBeNull();
    });

    it("formats valid dates using Swedish date format", () => {
        expect(FormatDate("2026-04-03T00:00:00.000Z")).toBe("2026-04-03");
    });

    it("returns dash when a date cannot be formatted", () => {
        expect(FormatDate(null)).toBe("—");
        expect(FormatDate("not-a-date")).toBe("—");
    });
});
