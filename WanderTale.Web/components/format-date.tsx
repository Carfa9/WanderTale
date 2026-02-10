export function SafeDate(value: string | null) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};

export function FormatDate(value: string | null) {
    const d = SafeDate(value);
    if (!d) return "—";
    return d.toLocaleDateString("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}