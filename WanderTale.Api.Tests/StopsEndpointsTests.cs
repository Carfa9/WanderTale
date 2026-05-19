using System.Net.Http.Json;
using WanderTale.Dto;
using Xunit;

namespace WanderTale.Api.Tests;

public sealed class StopsEndpointsTests : IDisposable
{
    private readonly ApiTestFactory _factory;
    private readonly HttpClient _client;

    public StopsEndpointsTests()
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

    [Fact]
    public async Task GetStops_WhenTripHasNoStops_ReturnsEmptyList()
    {
        var tripId = await CreateTrip();
        
        var stops = await _client.GetFromJsonAsync<List<StopResponse>>($"/trips/{tripId}/stops");
        
        Assert.NotNull(stops);
        Assert.Empty(stops);
    }

    [Fact]
    public async Task CreateStop_WhenTripExists_ReturnsCreatedStop()
    {
        var tripId = await CreateTrip();

        var request = new CreateStopRequest(
            "Kyoto",
            "Stop",
            new DateTime(2026, 4, 2),
            new DateTime(2026, 4, 15),
            "Japan",
            ["Plane", "Train"]
        );
        
        var response = await _client.PostAsJsonAsync($"/trips/{tripId}/stops", request);
        response.EnsureSuccessStatusCode();
        
        var created = await response.Content.ReadFromJsonAsync<StopResponse>();

        Assert.NotNull(created);
        Assert.Equal(tripId, created.TripId);
        Assert.Equal("Kyoto", created.Title);
        Assert.Equal("Stop", created.Description);
        Assert.Equal("Japan", created.Country);
        Assert.Equal(1, created.OrderIndex);
        Assert.Equal(["Plane", "Train"], created.TravelModes);
    }

    [Fact]
    public async Task CreateStop_WhenMultipleStopsExist_AssignsIncrementingOrderIndex()
    {
        var tripId = await CreateTrip();

        var firstRequest = new CreateStopRequest(
            "Kyoto",
            "First stop",
            new DateTime(2026, 4, 2),
            new DateTime(2026, 4, 4),
            "Japan",
            ["Train"]
        );

        var secondRequest = new CreateStopRequest(
            "Osaka",
            "Second stop",
            new DateTime(2026, 4, 5),
            new DateTime(2026, 4, 7),
            "Japan",
            ["Train"]
        );

        var firstResponse = await _client.PostAsJsonAsync($"/trips/{tripId}/stops", firstRequest);
        var secondResponse = await _client.PostAsJsonAsync($"/trips/{tripId}/stops", secondRequest);

        firstResponse.EnsureSuccessStatusCode();
        secondResponse.EnsureSuccessStatusCode();

        var first = await firstResponse.Content.ReadFromJsonAsync<StopResponse>();
        var second = await secondResponse.Content.ReadFromJsonAsync<StopResponse>();

        Assert.NotNull(first);
        Assert.NotNull(second);
        Assert.Equal(1, first.OrderIndex);
        Assert.Equal(2, second.OrderIndex);
    }

    [Fact]
    public async Task GetStops_WhenStopsExist_ReturnsStopsOrderedByOrderIndex()
    {
        var tripId = await CreateTrip();

        var firstRequest = new CreateStopRequest(
            "Kyoto",
            "First stop",
            new DateTime(2026, 4, 2),
            new DateTime(2026, 4, 4),
            "Japan",
            ["Train"]
        );

        var secondRequest = new CreateStopRequest(
            "Osaka",
            "Second stop",
            new DateTime(2026, 4, 5),
            new DateTime(2026, 4, 7),
            "Japan",
            ["Train"]
        );

        var firstResponse = await _client.PostAsJsonAsync($"/trips/{tripId}/stops", firstRequest);
        var secondResponse = await _client.PostAsJsonAsync($"/trips/{tripId}/stops", secondRequest);

        firstResponse.EnsureSuccessStatusCode();
        secondResponse.EnsureSuccessStatusCode();

        var stops = await _client.GetFromJsonAsync<List<StopResponse>>($"/trips/{tripId}/stops");

        Assert.NotNull(stops);
        Assert.Equal(2, stops.Count);
        Assert.Equal("Kyoto", stops[0].Title);
        Assert.Equal(1, stops[0].OrderIndex);
        Assert.Equal("Osaka", stops[1].Title);
        Assert.Equal(2, stops[1].OrderIndex);
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

    private sealed record StopResponse(
        Guid Id,
        Guid TripId,
        string Title,
        string? Description,
        DateTime? StartDate,
        DateTime? EndDate,
        string? Country,
        int OrderIndex,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        List<string> TravelModes
    );
}
