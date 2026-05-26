namespace WanderTale.Models;

public class Photo
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public string? ClientId { get; set; }
    public Guid? EntryId { get; set; }
    public string ImageUri { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public DateTime? PhotoDate { get; set; }
    public string? Location { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Trip Trip { get; set; } = null!;
}