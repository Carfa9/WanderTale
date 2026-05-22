using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace WanderTale.Endpoints;

internal static class EndpointAuth
{
    public static Guid? GetUserId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var userId) ? userId : null;
    }

    public static async Task<bool> OwnsTripAsync(AppDbContext db, Guid tripId, Guid userId)
    {
        return await db.Trips.AnyAsync(t => t.Id == tripId && t.UserId == userId);
    }
}
