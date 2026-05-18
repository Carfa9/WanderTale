namespace WanderTale.Dto;

public record UpdateTripRequest(
    string Title,
    string? Destination,
    string? Description,
    DateTime? StartDate,
    DateTime? EndDate,
    List<string> TravelModes
);
