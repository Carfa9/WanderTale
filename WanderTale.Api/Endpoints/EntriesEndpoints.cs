using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WanderTale.Dto;
using WanderTale.Models;

namespace WanderTale.Endpoints;

public static class EntriesEndpoints
{
    public static void MapEntriesEndpoints(this WebApplication app)
    {
        app.MapGet("/trips/{tripId:guid}/entries", async (AppDbContext db, Guid tripId, ClaimsPrincipal user) =>
        {
            var userId = EndpointAuth.GetUserId(user);
            if (userId is null) return Results.Unauthorized();
            if (!await EndpointAuth.OwnsTripAsync(db, tripId, userId.Value)) return Results.NotFound();

            var entries = await db.Entries
                .Where(e => e.TripId == tripId)
                .OrderByDescending(e => e.EntryDate)
                .Select(e => new { e.Id, e.Title, e.EntryDate, e.Content })
                .ToListAsync();

            return Results.Ok(entries);
        }).RequireAuthorization();

        app.MapPost("/trips/{tripId:guid}/entries",
            async (AppDbContext db, Guid tripId, CreateEntryRequest req, ClaimsPrincipal user) =>
            {
                var userId = EndpointAuth.GetUserId(user);
                if (userId is null) return Results.Unauthorized();
                if (!await EndpointAuth.OwnsTripAsync(db, tripId, userId.Value)) return Results.NotFound();

                if (EndpointValidation.ValidateTitle(req.Title) is { } titleError)
                    return titleError;

                if (EndpointValidation.ValidateRequiredText(req.Content, "content", "Content is required.") is { } contentError)
                    return contentError;

                var now = DateTime.UtcNow;

                var entry = new Entry
                {
                    Id = Guid.NewGuid(),
                    TripId = tripId,
                    EntryDate = req.EntryDate,
                    Title = req.Title.Trim(),
                    Content = req.Content.Trim(),
                    CreatedAt = now,
                    UpdatedAt = now
                };

                db.Entries.Add(entry);
                await db.SaveChangesAsync();

                return Results.Ok(entry);
            }
        ).RequireAuthorization();

        app.MapPut("/entries/{entryId:guid}",
            async (AppDbContext db, Guid entryId, UpdateEntryRequest req, ClaimsPrincipal user) =>
            {
                var userId = EndpointAuth.GetUserId(user);
                if (userId is null) return Results.Unauthorized();

                if (EndpointValidation.ValidateTitle(req.Title) is { } titleError)
                    return titleError;

                if (EndpointValidation.ValidateRequiredText(req.Content, "content", "Content is required.") is { } contentError)
                    return contentError;

                var entry = await db.Entries
                    .Include(e => e.Trip)
                    .FirstOrDefaultAsync(e => e.Id == entryId && e.Trip.UserId == userId.Value);
                if (entry is null) return Results.NotFound();

                entry.EntryDate = req.EntryDate;
                entry.Title = req.Title.Trim();
                entry.Content = req.Content.Trim();
                entry.UpdatedAt = DateTime.UtcNow;

                await db.SaveChangesAsync();
                return Results.Ok(new { entry.Id, entry.Title, entry.EntryDate, entry.Content });
            }).RequireAuthorization();

        app.MapDelete("/entries/{entryId:guid}", async (AppDbContext db, Guid entryId, ClaimsPrincipal user) =>
        {
            var userId = EndpointAuth.GetUserId(user);
            if (userId is null) return Results.Unauthorized();

            var entry = await db.Entries
                .Include(e => e.Trip)
                .FirstOrDefaultAsync(e => e.Id == entryId && e.Trip.UserId == userId.Value);
            if (entry is null) return Results.NotFound();

            db.Entries.Remove(entry);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization();
    }
}
