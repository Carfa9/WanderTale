using System.Net;
using System.Net.Http.Json;
using WanderTale.Dto;
using Xunit;

namespace WanderTale.Api.Tests;

public sealed class PhotosEndpointsTests : IDisposable
{
    private readonly ApiTestFactory _factory;
    private readonly HttpClient _client;

    public PhotosEndpointsTests()
    {
        _factory = new ApiTestFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<Guid> CreateTrip()
    {
        var request = new CreateTripRequest(
            "Tokyo",
            "Japan",
            "Spring trip",
            new DateTime(2026, 4, 1),
            new DateTime(2026, 4, 14),
            ["Plane"]
        );

        var response = await _client.PostAsJsonAsync("/trips", request);
        response.EnsureSuccessStatusCode();

        var trip = await response.Content.ReadFromJsonAsync<TripResponse>();
        Assert.NotNull(trip);

        return trip.Id;
    }

    private async Task<PhotoResponse> CreatePhoto(
        Guid tripId,
        string? caption = "Temple gate",
        DateTime? photoDate = null,
        string? location = "Kyoto")
    {
        using var content = CreatePhotoForm(caption, photoDate ?? new DateTime(2026, 4, 3), location);
        var response = await _client.PostAsync($"/trips/{tripId}/photos", content);
        response.EnsureSuccessStatusCode();

        var photo = await response.Content.ReadFromJsonAsync<PhotoResponse>();
        Assert.NotNull(photo);

        return photo;
    }

    private static MultipartFormDataContent CreatePhotoForm(
        string? caption,
        DateTime? photoDate,
        string? location)
    {
        var content = new MultipartFormDataContent();
        var imageContent = new ByteArrayContent([1, 2, 3, 4]);

        imageContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        content.Add(imageContent, "image", "test-photo.jpg");

        if (caption is not null) content.Add(new StringContent(caption), "caption");
        if (photoDate is not null) content.Add(new StringContent(photoDate.Value.ToString("O")), "photoDate");
        if (location is not null) content.Add(new StringContent(location), "location");

        return content;
    }

    private string GetSavedFilePath(PhotoResponse photo)
    {
        return Path.Combine(
            _factory.WebRootPath,
            photo.ImageUri.TrimStart('/').Replace('/', Path.DirectorySeparatorChar)
        );
    }

    [Fact]
    public async Task GetPhotos_WhenTripHasNoPhotos_ReturnsEmptyList()
    {
        var tripId = await CreateTrip();

        var photos = await _client.GetFromJsonAsync<List<PhotoResponse>>($"/trips/{tripId}/photos");

        Assert.NotNull(photos);
        Assert.Empty(photos);
    }

    [Fact]
    public async Task CreatePhoto_WhenImageIsProvided_ReturnsCreatedPhotoAndSavesFile()
    {
        var tripId = await CreateTrip();

        var photo = await CreatePhoto(tripId);

        Assert.Equal(tripId, photo.TripId);
        Assert.Equal("Temple gate", photo.Caption);
        Assert.Equal(new DateTime(2026, 4, 3), photo.PhotoDate);
        Assert.Equal("Kyoto", photo.Location);
        Assert.StartsWith($"/uploads/trips/{tripId}/", photo.ImageUri);
        Assert.EndsWith(".jpg", photo.ImageUri);
        Assert.True(File.Exists(GetSavedFilePath(photo)));
    }

    [Fact]
    public async Task CreatePhoto_WhenImageIsMissing_ReturnsBadRequest()
    {
        var tripId = await CreateTrip();
        using var content = new MultipartFormDataContent();
        content.Add(new StringContent("Missing image"), "caption");

        var response = await _client.PostAsync($"/trips/{tripId}/photos", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetPhotos_WhenPhotosExist_ReturnsPhotosForTrip()
    {
        var tripId = await CreateTrip();
        var created = await CreatePhoto(tripId);

        var photos = await _client.GetFromJsonAsync<List<PhotoResponse>>($"/trips/{tripId}/photos");

        Assert.NotNull(photos);
        Assert.Single(photos);
        Assert.Equal(created.Id, photos[0].Id);
        Assert.Equal("Temple gate", photos[0].Caption);
    }

    [Fact]
    public async Task UpdatePhotoCaption_WhenPhotoExists_ReturnsUpdatedCaption()
    {
        var tripId = await CreateTrip();
        var created = await CreatePhoto(tripId);
        var request = new UpdateCaptionRequest("  Updated caption  ");

        var response = await _client.PatchAsJsonAsync($"/photos/{created.Id}/caption", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<CaptionResponse>();

        Assert.NotNull(updated);
        Assert.Equal(created.Id, updated.Id);
        Assert.Equal("Updated caption", updated.Caption);
    }

    [Fact]
    public async Task DeletePhoto_WhenPhotoExists_ReturnsNoContentAndRemovesPhotoAndFile()
    {
        var tripId = await CreateTrip();
        var created = await CreatePhoto(tripId);
        var filePath = GetSavedFilePath(created);

        Assert.True(File.Exists(filePath));

        var deleteResponse = await _client.DeleteAsync($"/photos/{created.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.False(File.Exists(filePath));

        var photos = await _client.GetFromJsonAsync<List<PhotoResponse>>($"/trips/{tripId}/photos");

        Assert.NotNull(photos);
        Assert.DoesNotContain(photos, photo => photo.Id == created.Id);
    }

    private sealed record TripResponse(
        Guid Id,
        string Title,
        string? Destination,
        DateTime? StartDate,
        DateTime? EndDate,
        string? Description,
        List<string> TravelModes
    );

    private sealed record PhotoResponse(
        Guid Id,
        Guid TripId,
        Guid? EntryId,
        string ImageUri,
        string? Caption,
        DateTime? PhotoDate,
        string? Location,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    private sealed record CaptionResponse(Guid Id, string? Caption);
}
