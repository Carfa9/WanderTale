using System.Net;
using System.Net.Http.Json;
using WanderTale.Dto;
using Xunit;

namespace WanderTale.Api.Tests;

public sealed class EntriesEndpointsTests : IDisposable
{
    private readonly ApiTestFactory _factory;
    private readonly HttpClient _client;

    public EntriesEndpointsTests()
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

    private async Task<EntryCreatedResponse> CreateEntry(
        Guid tripId,
        string title = "Trip entry",
        string content = "Trip entry content",
        DateTime? entryDate = null)
    {
        var request = new CreateEntryRequest(
            entryDate ?? new DateTime(2026, 4, 1),
            title,
            content
        );

        var response = await _client.PostAsJsonAsync($"/trips/{tripId}/entries", request);
        response.EnsureSuccessStatusCode();

        var entry = await response.Content.ReadFromJsonAsync<EntryCreatedResponse>();
        Assert.NotNull(entry);

        return entry;
    }

    [Fact]
    public async Task GetEntries_WhenNoEntriesExist_ReturnsEmptyList()
    {
        var tripId = await CreateTrip();

        var entries = await _client.GetFromJsonAsync<List<EntryResponse>>($"/trips/{tripId}/entries");

        Assert.NotNull(entries);
        Assert.Empty(entries);
    }

    [Fact]
    public async Task CreateEntry_WhenTripExists_ReturnsCreatedEntry()
    {
        var tripId = await CreateTrip();

        var created = await CreateEntry(tripId);

        Assert.Equal(tripId, created.TripId);
        Assert.Equal("Trip entry", created.Title);
        Assert.Equal("Trip entry content", created.Content);
        Assert.Equal(new DateTime(2026, 4, 1), created.EntryDate);
    }

    [Fact]
    public async Task CreateEntry_WhenContentIsBlank_ReturnsBadRequest()
    {
        var tripId = await CreateTrip();
        var request = new CreateEntryRequest(
            new DateTime(2026, 4, 1),
            "Trip entry",
            "   "
        );

        var response = await _client.PostAsJsonAsync($"/trips/{tripId}/entries", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetEntries_WhenEntriesExist_ReturnsEntriesOrderedByEntryDateDescending()
    {
        var tripId = await CreateTrip();

        await CreateEntry(tripId, "First entry", "First content", new DateTime(2026, 4, 1));
        await CreateEntry(tripId, "Second entry", "Second content", new DateTime(2026, 4, 3));

        var entries = await _client.GetFromJsonAsync<List<EntryResponse>>($"/trips/{tripId}/entries");

        Assert.NotNull(entries);
        Assert.Equal(2, entries.Count);
        Assert.Equal("Second entry", entries[0].Title);
        Assert.Equal("First entry", entries[1].Title);
    }

    [Fact]
    public async Task UpdateEntry_WhenEntryExists_ReturnsUpdatedEntry()
    {
        var tripId = await CreateTrip();
        var created = await CreateEntry(tripId);

        var updateRequest = new UpdateEntryRequest(
            new DateTime(2026, 4, 5),
            "Updated entry",
            "Updated content"
        );

        var response = await _client.PutAsJsonAsync($"/entries/{created.Id}", updateRequest);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<EntryResponse>();

        Assert.NotNull(updated);
        Assert.Equal(created.Id, updated.Id);
        Assert.Equal("Updated entry", updated.Title);
        Assert.Equal("Updated content", updated.Content);
        Assert.Equal(new DateTime(2026, 4, 5), updated.EntryDate);
    }

    [Fact]
    public async Task DeleteEntry_WhenEntryExists_ReturnsNoContentAndEntryIsRemoved()
    {
        var tripId = await CreateTrip();
        var created = await CreateEntry(tripId);

        var deleteResponse = await _client.DeleteAsync($"/entries/{created.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var entries = await _client.GetFromJsonAsync<List<EntryResponse>>($"/trips/{tripId}/entries");

        Assert.NotNull(entries);
        Assert.DoesNotContain(entries, entry => entry.Id == created.Id);
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

    private sealed record EntryCreatedResponse(
        Guid Id,
        Guid TripId,
        DateTime? EntryDate,
        string Title,
        string Content,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    private sealed record EntryResponse(
        Guid Id,
        DateTime? EntryDate,
        string Title,
        string Content
    );
}
