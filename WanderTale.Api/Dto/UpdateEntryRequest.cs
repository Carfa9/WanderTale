namespace WanderTale.Dto;

public record UpdateEntryRequest(DateTime? EntryDate, string Title, string Content);
