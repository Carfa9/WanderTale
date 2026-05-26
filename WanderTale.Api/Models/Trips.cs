namespace WanderTale.Models;

public class Trip
{
    public Guid Id { get; set; }
    public string? ClientId { get; set; }
    public Guid UserId { get; set; }

    public string Title { get; set; } = null!;
    public string? Destination { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<TripTravelMode> TravelModes { get; set; } = new();
    public List<Entry> Entries { get; set; } = new();
    public List<Photo> Photos { get; set; } = new();
    public List<Stop> Stops { get; set; } = new();
}