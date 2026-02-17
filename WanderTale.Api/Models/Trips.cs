namespace WanderTale.Models;

public class Trip
{
    public Guid Id { get; set; }
    public int UserId { get; set; }

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
    public List<Leg> Legs { get; set; } = new();

}

public class TripTravelMode
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public string Mode { get; set; } = ""; // "car"
}

public class Entry
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public DateTime? EntryDate { get; set; }
    public string Title { get; set; }
    public string Content { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Trip Trip { get; set; }
}

public class Photo
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public Guid EntryId { get; set; }

    public string ImageUrl { get; set; }
    public string? Caption { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Trip Trip { get; set; }
}

public class Leg
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public string Title { get; set; }
    public string? Description { get; set; }
    public DateTime DueDate { get; set; }
    public bool IsCompleted { get; set; }
    public string tripModeId { get; set; }
}