using System.Net;
using System.Net.Http.Json;
using WanderTale.Dto;
using Xunit;

namespace WanderTale.Api.Tests;

public sealed class TripsEndpointsTests : IDisposable
{
    private readonly ApiTestFactory _factory;
    private readonly HttpClient _client;

    public TripsEndpointsTests()
    {
        _factory = new ApiTestFactory();
        _client = _factory.CreateClient();
    }
    
    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    [Fact]
    public async Task GetTrips_WhenNoTripsExist_ReturnsEmptyList()
    {
        var trips = await _client.GetFromJsonAsync<List<TripResponse>>("/trips");

        Assert.NotNull(trips);
        Assert.Empty(trips);
    }

    [Fact]
    public async Task CreateTrip_ThenGetTrip_ReturnsCreatedTrip()
    {
        var request = new CreateTripRequest(
            "Tokyo",
            "Japan",
            "Spring trip",
            new DateTime(2026, 4, 1),
            new DateTime(2026, 4, 14),
            ["Plane", "Train"]
        );

        var createResponse = await _client.PostAsJsonAsync("/trips", request);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content.ReadFromJsonAsync<TripResponse>();
        Assert.NotNull(created);
        Assert.Equal("Tokyo", created.Title);
        Assert.Equal(["Plane", "Train"], created.TravelModes);

        var fetched = await _client.GetFromJsonAsync<TripResponse>($"/trips/{created.Id}");

        Assert.NotNull(fetched);
        Assert.Equal(created.Id, fetched.Id);
        Assert.Equal("Japan", fetched.Destination);
    }

    [Fact]
    public async Task CreateTrip_WithSameClientIdTwice_ReturnsExistingTrip()
    {
        var request = new CreateTripRequest(
            "Tokyo",
            "Japan",
            "Spring trip",
            new DateTime(2026, 4, 1),
            new DateTime(2026, 4, 14),
            ["Plane", "Plane", "Train"],
            "trip_local_1"
        );

        var firstResponse = await _client.PostAsJsonAsync("/trips", request);
        var secondResponse = await _client.PostAsJsonAsync("/trips", request);

        firstResponse.EnsureSuccessStatusCode();
        secondResponse.EnsureSuccessStatusCode();

        var first = await firstResponse.Content.ReadFromJsonAsync<TripResponse>();
        var second = await secondResponse.Content.ReadFromJsonAsync<TripResponse>();
        var trips = await _client.GetFromJsonAsync<List<TripResponse>>("/trips");

        Assert.NotNull(first);
        Assert.NotNull(second);
        Assert.NotNull(trips);
        Assert.Equal(first.Id, second.Id);
        Assert.Single(trips);
        Assert.Equal(["Plane", "Train"], first.TravelModes);
    }

    [Fact]
    public async Task CreateTrip_WhenTitleIsBlank_ReturnsBadRequest()
    {
        var request = new CreateTripRequest(
            "   ",
            "Japan",
            "Spring trip",
            new DateTime(2026, 4, 1),
            new DateTime(2026, 4, 14),
            ["Plane"]
        );

        var response = await _client.PostAsJsonAsync("/trips", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateTrip_WhenEndDateIsBeforeStartDate_ReturnsBadRequest()
    {
        var request = new CreateTripRequest(
            "Tokyo",
            "Japan",
            "Spring trip",
            new DateTime(2026, 4, 14),
            new DateTime(2026, 4, 1),
            ["Plane"]
        );

        var response = await _client.PostAsJsonAsync("/trips", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateTrip_WhenTripsExist_ReturnsUpdatedTrip()
    {
        var request = new CreateTripRequest(
            "Tokyo",
            "Japan",
            "Spring trip",
            new DateTime(2026, 4, 1),
            new DateTime(2026, 4, 14),
            ["Plane"]
        );
        
        var createResponse = await _client.PostAsJsonAsync("/trips", request);
        var created = await createResponse.Content.ReadFromJsonAsync<TripResponse>();
        
        Assert.NotNull(created);
        
        var updateRequest = new UpdateTripRequest(
            "Kyoto",
            "Japan",
            "Updated trip",
            new DateTime(2026, 4, 2),
            new DateTime(2026, 4, 15),
            ["Train"]
        );
        
        var updateResponse = await _client.PutAsJsonAsync($"/trips/{created.Id}", updateRequest);
        
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        
        var updated = await updateResponse.Content.ReadFromJsonAsync<TripResponse>();
        
        Assert.NotNull(updated);
        Assert.Equal(created.Id, updated.Id);
        Assert.Equal("Kyoto", updated.Title);
        Assert.Equal("Updated trip", updated.Description);
        Assert.Equal(["Train"], updated.TravelModes);
    }

    [Fact]
    public async Task DeleteTrip_WhenTripExists_ReturnsNoContentAndTripCannotBeFetched()
    {
        var request = new CreateTripRequest(
            "Tokyo",
            "Japan",
            "Spring trip",
            new DateTime(2026, 4, 1),
            new DateTime(2026, 4, 14),
            ["Plane"]
        );

        var createResponse = await _client.PostAsJsonAsync("/trips", request);
        var created = await createResponse.Content.ReadFromJsonAsync<TripResponse>();

        Assert.NotNull(created);

        var deleteResponse = await _client.DeleteAsync($"/trips/{created.Id}");
        var getDeletedResponse = await _client.GetAsync($"/trips/{created.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, getDeletedResponse.StatusCode);
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
}
