namespace WanderTale.Models;

public class Stop
{
    public Guid Id { get; set; }
    public string? ClientId { get; set; }

    public Guid TripId { get; set; }
    public Trip Trip { get; set; } = null!;

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public string? Country { get; set; }

    public int OrderIndex { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    public List<StopTravelMode> TravelModes { get; set; } = new();
}