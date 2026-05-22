namespace WanderTale.Models;

public class Trip
{
    public Guid Id { get; set; }
    public string? ClientId { get; set; }
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
    public List<Stop> Stops { get; set; } = new();

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
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Trip Trip { get; set; } = null!;
}

public class Photo
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public Guid? EntryId { get; set; }

    public string ImageUri { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public DateTime? PhotoDate { get; set; }
    public string? Location { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Trip Trip { get; set; } = null!;
}

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

public class StopTravelMode
{
    public Guid Id { get; set; }
    public Guid StopId { get; set; }
    public Stop Stop { get; set; } = null!;
    public string Mode { get; set; } = "";
}
