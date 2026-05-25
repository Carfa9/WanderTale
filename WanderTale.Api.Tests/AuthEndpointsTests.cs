using System.Net;
using System.Net.Http.Json;
using WanderTale.Dto;
using Xunit;

namespace WanderTale.Api.Tests;

public sealed class AuthEndpointsTests : IDisposable
{
    private readonly ApiTestFactory _factory;
    private readonly HttpClient _client;

    public AuthEndpointsTests()
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
    public async Task Register_WhenInputIsValid_ReturnsTokenAndRefreshToken()
    {
        var response = await Register("test@example.com");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
        Assert.False(string.IsNullOrWhiteSpace(auth.RefreshToken));
        Assert.True(auth.AccessTokenExpiresAt > DateTime.UtcNow);
        Assert.Equal("test@example.com", auth.Email);
        Assert.Equal("Test User", auth.Name);
    }

    [Fact]
    public async Task Register_WhenEmailAlreadyExists_ReturnsConflict()
    {
        (await Register("test@example.com")).EnsureSuccessStatusCode();

        var response = await Register("test@example.com");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Theory]
    [InlineData("not-an-email", "password123")]
    [InlineData("test@example.com", "short")]
    public async Task Register_WhenInputIsInvalid_ReturnsBadRequest(string email, string password)
    {
        var response = await _client.PostAsJsonAsync("/auth/register", new RegisterRequest(
            "Test User",
            email,
            password
        ));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_WhenRefreshTokenIsValid_RotatesRefreshToken()
    {
        var registerResponse = await Register("test@example.com");
        registerResponse.EnsureSuccessStatusCode();

        var original = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(original);

        var refreshResponse = await _client.PostAsJsonAsync("/auth/refresh", new RefreshRequest(original.RefreshToken));
        refreshResponse.EnsureSuccessStatusCode();

        var refreshed = await refreshResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(refreshed);
        Assert.NotEqual(original.RefreshToken, refreshed.RefreshToken);

        var reusedResponse = await _client.PostAsJsonAsync("/auth/refresh", new RefreshRequest(original.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, reusedResponse.StatusCode);
    }

    [Fact]
    public async Task Logout_WhenRefreshTokenIsProvided_RevokesRefreshToken()
    {
        var registerResponse = await Register("test@example.com");
        registerResponse.EnsureSuccessStatusCode();

        var auth = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);

        var logoutResponse = await _client.PostAsJsonAsync("/auth/logout", new LogoutRequest(auth.RefreshToken));
        Assert.Equal(HttpStatusCode.NoContent, logoutResponse.StatusCode);

        var refreshResponse = await _client.PostAsJsonAsync("/auth/refresh", new RefreshRequest(auth.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, refreshResponse.StatusCode);
    }

    private Task<HttpResponseMessage> Register(string email)
    {
        return _client.PostAsJsonAsync("/auth/register", new RegisterRequest(
            "Test User",
            email,
            "password123"
        ));
    }
}
