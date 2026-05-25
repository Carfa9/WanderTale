using System.Net;
using System.Net.Http.Json;
using WanderTale.Dto;
using Xunit;

namespace WanderTale.Api.Tests;

public sealed class OwnershipEndpointsTests : IDisposable
{
    private static readonly Guid UserA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid UserB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly ApiTestFactory _factory;
    private readonly HttpClient _clientA;
    private readonly HttpClient _clientB;

    public OwnershipEndpointsTests()
    {
        _factory = new ApiTestFactory();
        _clientA = CreateClientFor(UserA);
        _clientB = CreateClientFor(UserB);
    }

    public void Dispose()
    {
        _clientA.Dispose();
        _clientB.Dispose();
        _factory.Dispose();
    }

    [Fact]
    public async Task TripEndpoints_WhenTripBelongsToAnotherUser_ReturnNotFound()
    {
        var tripId = await CreateTrip(_clientA);
        var updateRequest = new UpdateTripRequest(
            "Osaka",
            "Japan",
            "Updated trip",
            new DateTime(2026, 4, 3),
            new DateTime(2026, 4, 12),
            ["Train"]
        );

        var listResponse = await _clientB.GetFromJsonAsync<List<TripResponse>>("/trips");
        var getResponse = await _clientB.GetAsync($"/trips/{tripId}");
        var updateResponse = await _clientB.PutAsJsonAsync($"/trips/{tripId}", updateRequest);
        var deleteResponse = await _clientB.DeleteAsync($"/trips/{tripId}");

        Assert.NotNull(listResponse);
        Assert.DoesNotContain(listResponse, trip => trip.Id == tripId);
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task StopEndpoints_WhenTripBelongsToAnotherUser_ReturnNotFound()
    {
        var tripId = await CreateTrip(_clientA);
        var stop = await CreateStop(_clientA, tripId);

        var updateRequest = new UpdateStopRequest(
            "Osaka",
            "Updated stop",
            new DateTime(2026, 4, 5),
            new DateTime(2026, 4, 7),
            "Japan",
            2,
            ["Train"]
        );

        var getResponse = await _clientB.GetAsync($"/trips/{tripId}/stops");
        var createResponse = await _clientB.PostAsJsonAsync($"/trips/{tripId}/stops", CreateStopRequest());
        var updateResponse = await _clientB.PutAsJsonAsync($"/stops/{stop.Id}", updateRequest);
        var deleteResponse = await _clientB.DeleteAsync($"/stops/{stop.Id}");

        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, createResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task EntryEndpoints_WhenTripBelongsToAnotherUser_ReturnNotFound()
    {
        var tripId = await CreateTrip(_clientA);
        var entry = await CreateEntry(_clientA, tripId);
        var updateRequest = new UpdateEntryRequest(new DateTime(2026, 4, 5), "Updated entry", "Updated content");

        var getResponse = await _clientB.GetAsync($"/trips/{tripId}/entries");
        var createResponse = await _clientB.PostAsJsonAsync($"/trips/{tripId}/entries", CreateEntryRequest());
        var updateResponse = await _clientB.PutAsJsonAsync($"/entries/{entry.Id}", updateRequest);
        var deleteResponse = await _clientB.DeleteAsync($"/entries/{entry.Id}");

        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, createResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task PhotoEndpoints_WhenTripBelongsToAnotherUser_ReturnNotFound()
    {
        var tripId = await CreateTrip(_clientA);
        var photo = await CreatePhoto(_clientA, tripId);
        var captionRequest = new UpdateCaptionRequest("Updated caption");

        var getResponse = await _clientB.GetAsync($"/trips/{tripId}/photos");
        using var uploadContent = CreatePhotoForm();
        var createResponse = await _clientB.PostAsync($"/trips/{tripId}/photos", uploadContent);
        var updateResponse = await _clientB.PatchAsJsonAsync($"/photos/{photo.Id}/caption", captionRequest);
        var deleteResponse = await _clientB.DeleteAsync($"/photos/{photo.Id}");

        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, createResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
    }

    private HttpClient CreateClientFor(Guid userId)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, userId.ToString());
        return client;
    }

    private static CreateTripRequest CreateTripRequest()
    {
        return new CreateTripRequest(
            "Tokyo",
            "Japan",
            "Spring trip",
            new DateTime(2026, 4, 1),
            new DateTime(2026, 4, 14),
            ["Plane"]
        );
    }

    private static CreateStopRequest CreateStopRequest()
    {
        return new CreateStopRequest(
            "Kyoto",
            "Stop",
            new DateTime(2026, 4, 2),
            new DateTime(2026, 4, 4),
            "Japan",
            ["Train"]
        );
    }

    private static CreateEntryRequest CreateEntryRequest()
    {
        return new CreateEntryRequest(new DateTime(2026, 4, 1), "Trip entry", "Trip entry content");
    }

    private static MultipartFormDataContent CreatePhotoForm()
    {
        var content = new MultipartFormDataContent();
        var imageContent = new ByteArrayContent([1, 2, 3, 4]);
        imageContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        content.Add(imageContent, "image", "test-photo.jpg");
        return content;
    }

    private static async Task<Guid> CreateTrip(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/trips", CreateTripRequest());
        response.EnsureSuccessStatusCode();

        var trip = await response.Content.ReadFromJsonAsync<TripResponse>();
        Assert.NotNull(trip);
        return trip.Id;
    }

    private static async Task<StopResponse> CreateStop(HttpClient client, Guid tripId)
    {
        var response = await client.PostAsJsonAsync($"/trips/{tripId}/stops", CreateStopRequest());
        response.EnsureSuccessStatusCode();

        var stop = await response.Content.ReadFromJsonAsync<StopResponse>();
        Assert.NotNull(stop);
        return stop;
    }

    private static async Task<EntryResponse> CreateEntry(HttpClient client, Guid tripId)
    {
        var response = await client.PostAsJsonAsync($"/trips/{tripId}/entries", CreateEntryRequest());
        response.EnsureSuccessStatusCode();

        var entry = await response.Content.ReadFromJsonAsync<EntryResponse>();
        Assert.NotNull(entry);
        return entry;
    }

    private static async Task<PhotoResponse> CreatePhoto(HttpClient client, Guid tripId)
    {
        using var content = CreatePhotoForm();
        var response = await client.PostAsync($"/trips/{tripId}/photos", content);
        response.EnsureSuccessStatusCode();

        var photo = await response.Content.ReadFromJsonAsync<PhotoResponse>();
        Assert.NotNull(photo);
        return photo;
    }

    private sealed record TripResponse(Guid Id);

    private sealed record StopResponse(Guid Id);

    private sealed record EntryResponse(Guid Id);

    private sealed record PhotoResponse(Guid Id);
}
