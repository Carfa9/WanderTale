namespace WanderTale.Dto;

public record CreatePhotoRequest(string EntryId, string ImageUri, string? Caption, string? ClientId = null);