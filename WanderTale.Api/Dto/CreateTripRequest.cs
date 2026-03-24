namespace WanderTale.Dto;
public record CreateTripRequest(
    string Title,
    string? Destination,
    string? Description,
    DateTime? StartDate,
    DateTime? EndDate,
    List<string> TravelModes
);