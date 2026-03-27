namespace WanderTale.Dto;

public abstract record CreatePhotoRequest(string EntryId, string ImageUri, string? Caption);