namespace WanderTale.Models;

public class StopTravelMode
{
    public Guid Id { get; set; }
    public Guid StopId { get; set; }
    public Stop Stop { get; set; } = null!;
    public string Mode { get; set; } = "";
}