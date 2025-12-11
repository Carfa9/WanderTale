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
    
}