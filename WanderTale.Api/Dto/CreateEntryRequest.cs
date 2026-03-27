namespace WanderTale.Dto;


public abstract record CreateEntryRequest(DateTime? EntryDate, string Title, string Content);
