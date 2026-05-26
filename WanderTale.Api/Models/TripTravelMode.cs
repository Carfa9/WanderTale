namespace WanderTale.Models;

public class TripTravelMode
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public string Mode { get; set; } = "";
}