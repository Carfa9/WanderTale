using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WanderTale.Dto;
using WanderTale.Models;

namespace WanderTale.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/auth");

        group.MapPost("/register", async
            (AppDbContext db, RegisterRequest request, IPasswordHasher<User> passwordHasher, IConfiguration config) =>
        {
            var email = request.Email.Trim().ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
                return Results.BadRequest("Email and password are required.");

            var exists = await db.Users.AnyAsync(u => u.Email == email);
            if (exists)
                return Results.Conflict("Email is already registered.");

            var user = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                CreatedAt = DateTime.UtcNow
            };

            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

            db.Users.Add(user);
            await db.SaveChangesAsync();

            var token = CreateToken(user, config);
            return Results.Ok(new AuthResponse(token, user.Email));
        }).AllowAnonymous();

        group.MapPost("/login", async
            (AppDbContext db, LoginRequest request, IPasswordHasher<User> passwordHasher, IConfiguration config) =>
        {
            var email = request.Email.Trim().ToLowerInvariant();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user is null)
                return Results.Unauthorized();

            var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
            if (result == PasswordVerificationResult.Failed)
                return Results.Unauthorized();

            var token = CreateToken(user, config);
            return Results.Ok(new AuthResponse(token, user.Email));
        }).AllowAnonymous();

        group.MapGet("/me", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            var userIdValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(userIdValue, out var userId))
                return Results.Unauthorized();

            var user = await db.Users.Where(u => u.Id == userId)
                .Select(u => new { u.Id, u.Email })
                .FirstOrDefaultAsync();

            return user is null ? Results.Unauthorized() : Results.Ok(user);
        }).RequireAuthorization();
    }

    private static string CreateToken(User user, IConfiguration config)
    {
        var signingKey = config["Jwt:SigningKey"]
                         ?? throw new InvalidOperationException("Missing Jwt:SigningKey");

        var issuer = config["Jwt:Issuer"] ?? "WanderTale";
        var audience = config["Jwt:Audience"] ?? "WanderTale";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email)
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
