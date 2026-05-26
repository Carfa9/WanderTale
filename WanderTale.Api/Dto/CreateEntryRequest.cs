namespace WanderTale.Dto;


public record CreateEntryRequest(DateTime? EntryDate, string Title, string Content, string? ClientId = null);
