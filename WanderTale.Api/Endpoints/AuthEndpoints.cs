using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WanderTale.Dto;
using WanderTale.Models;

namespace WanderTale.Endpoints;

public static class AuthEndpoints
{
    private static readonly Regex EmailRegex = new("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", RegexOptions.Compiled);
    private const int MinPasswordLength = 8;

    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/auth");

        group.MapPost("/register", async
            (AppDbContext db, RegisterRequest request, IPasswordHasher<User> passwordHasher, IConfiguration config) =>
        {
            var name = request.Name.Trim();
            var email = request.Email.Trim().ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(name))
                return Results.BadRequest(new AuthError("Name is required."));

            if (!IsValidEmail(email))
                return Results.BadRequest(new AuthError("Enter a valid email address."));

            if (!IsValidPassword(request.Password))
                return Results.BadRequest(new AuthError($"Password must be at least {MinPasswordLength} characters."));

            var exists = await db.Users.AnyAsync(u => u.Email == email);
            if (exists)
                return Results.Conflict(new AuthError("Email is already registered."));

            var user = new User
            {
                Id = Guid.NewGuid(),
                Name = name,
                Email = email,
                CreatedAt = DateTime.UtcNow
            };

            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

            db.Users.Add(user);
            await db.SaveChangesAsync();

            return Results.Ok(await CreateAuthResponse(db, user, config));
        }).AllowAnonymous();

        group.MapPost("/login", async
            (AppDbContext db, LoginRequest request, IPasswordHasher<User> passwordHasher, IConfiguration config) =>
        {
            var email = request.Email.Trim().ToLowerInvariant();

            if (!IsValidEmail(email) || string.IsNullOrWhiteSpace(request.Password))
                return Results.BadRequest(new AuthError("Email and password are required."));

            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user is null)
                return Results.Unauthorized();

            var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
            if (result == PasswordVerificationResult.Failed)
                return Results.Unauthorized();

            return Results.Ok(await CreateAuthResponse(db, user, config));
        }).AllowAnonymous();

        group.MapPost("/refresh", async (AppDbContext db, RefreshRequest request, IConfiguration config) =>
        {
            if (string.IsNullOrWhiteSpace(request.RefreshToken))
                return Results.Unauthorized();

            var tokenHash = HashToken(request.RefreshToken);
            var refreshToken = await db.RefreshTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

            if (refreshToken is null ||
                refreshToken.RevokedAt is not null ||
                refreshToken.ExpiresAt <= DateTime.UtcNow)
            {
                return Results.Unauthorized();
            }

            refreshToken.RevokedAt = DateTime.UtcNow;
            return Results.Ok(await CreateAuthResponse(db, refreshToken.User, config));
        }).AllowAnonymous();

        group.MapPost("/logout", async (AppDbContext db, LogoutRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.RefreshToken))
                return Results.NoContent();

            var tokenHash = HashToken(request.RefreshToken);
            var refreshToken = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

            if (refreshToken is not null && refreshToken.RevokedAt is null)
            {
                refreshToken.RevokedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }

            return Results.NoContent();
        }).AllowAnonymous();

        group.MapGet("/me", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            var userIdValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdValue, out var userId))
                return Results.Unauthorized();

            var user = await db.Users.Where(u => u.Id == userId)
                .Select(u => new { u.Id, u.Email, u.Name })
                .FirstOrDefaultAsync();

            return user is null ? Results.Unauthorized() : Results.Ok(user);
        }).RequireAuthorization();
    }

    private static async Task<AuthResponse> CreateAuthResponse(AppDbContext db, User user, IConfiguration config)
    {
        await DeleteExpiredRefreshTokens(db);

        var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(15);
        var accessToken = CreateToken(user, config, accessTokenExpiresAt);
        var refreshToken = CreateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = HashToken(refreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        return new AuthResponse(accessToken, refreshToken, accessTokenExpiresAt, user.Email, user.Name);
    }

    private static string CreateToken(User user, IConfiguration config, DateTime expiresAt)
    {
        var signingKey = config["Jwt:SigningKey"]
                         ?? throw new InvalidOperationException("Missing Jwt:SigningKey");

        var issuer = config["Jwt:Issuer"] ?? "WanderTale";
        var audience = config["Jwt:Audience"] ?? "WanderTale";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name)
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static bool IsValidEmail(string email) => EmailRegex.IsMatch(email);

    private static bool IsValidPassword(string password) => password.Length >= MinPasswordLength;

    private static string CreateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    private static async Task DeleteExpiredRefreshTokens(AppDbContext db)
    {
        var cutoff = DateTime.UtcNow.AddDays(-7);
        await db.RefreshTokens
            .Where(t => t.ExpiresAt <= DateTime.UtcNow || (t.RevokedAt != null && t.RevokedAt <= cutoff))
            .ExecuteDeleteAsync();
    }

    private sealed record AuthError(string Message);
}
