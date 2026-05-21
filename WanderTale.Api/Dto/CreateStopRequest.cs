namespace WanderTale.Dto;
public record CreateStopRequest(
    string Title,
    string? Description,
    DateTime? StartDate,
    DateTime? EndDate,
    string? Country,
    List<string> TravelModes,
    string? ClientId = null
);
