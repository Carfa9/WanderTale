namespace WanderTale.Models;

    public class Entry
    {
        public Guid Id { get; set; }
        public Guid TripId { get; set; }
        public  string? ClientId { get; set; }
        public DateTime? EntryDate { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public Trip Trip { get; set; } = null!;
    }
