namespace WanderTale.Dto;

public record UpdateStopRequest(
    string Title,
    string? Description,
    DateTime? StartDate,
    DateTime? EndDate,
    string? Country,
    int? OrderIndex,
    List<string> TravelModes
);
