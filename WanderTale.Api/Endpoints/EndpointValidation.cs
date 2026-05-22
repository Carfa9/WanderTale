namespace WanderTale.Endpoints;

internal static class EndpointValidation
{
    public static IResult? ValidateTitle(string? title, string fieldName = "title")
    {
        if (!string.IsNullOrWhiteSpace(title)) return null;

        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            [fieldName] = ["Title is required."]
        });
    }

    public static IResult? ValidateRequiredText(string? value, string fieldName, string message)
    {
        if (!string.IsNullOrWhiteSpace(value)) return null;

        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            [fieldName] = [message]
        });
    }

    public static IResult? ValidateDateRange(DateTime? startDate, DateTime? endDate)
    {
        if (startDate is null || endDate is null || startDate <= endDate) return null;

        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["endDate"] = ["End date must be on or after start date."]
        });
    }

    public static List<string> NormalizeTravelModes(IEnumerable<string>? travelModes)
    {
        return (travelModes ?? [])
            .Select(mode => mode.Trim())
            .Where(mode => mode.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
