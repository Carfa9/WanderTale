namespace WanderTale.Models;

public class Trip
{
    public int Id { get; set; }
    public int UserId { get; set; }

    public string Title { get; set; } = null!;
    public string? Destination { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public string? Description { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<TripTravelMode> TravelModes { get; set; } = new();
}

public class TripTravelMode
{
    public int Id { get; set; }
    public int TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public string Mode { get; set; } = ""; // "car"
}