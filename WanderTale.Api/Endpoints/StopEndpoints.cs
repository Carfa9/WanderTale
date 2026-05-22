using Microsoft.EntityFrameworkCore;
using WanderTale.Dto;
using WanderTale.Models;

namespace WanderTale.Endpoints;

public static class StopEndpoints
{
    public static void MapStopEndpoints(this WebApplication app)
    {
        app.MapGet("/trips/{tripId:guid}/stops", async (AppDbContext db, Guid tripId) =>
        {
            var stops = await db.Stops
                .Include(s => s.TravelModes)
                .Where(s => s.TripId == tripId)
                .OrderBy(s => s.OrderIndex)
                .Select(s => new
                {
                    s.Id,
                    s.ClientId,
                    s.TripId,
                    s.Title,
                    s.Description,
                    s.StartDate,
                    s.EndDate,
                    s.Country,
                    s.OrderIndex,
                    s.CreatedAt,
                    s.UpdatedAt,
                    TravelModes = s.TravelModes.Select(x => x.Mode).ToList(),
                }).ToListAsync();

            return Results.Ok(stops);

        });
        
        app.MapPost("/trips/{tripId:guid}/stops", async (AppDbContext db, Guid tripId, CreateStopRequest request) =>
        {
            try
            {
                if (EndpointValidation.ValidateTitle(request.Title) is { } titleError)
                    return titleError;

                if (EndpointValidation.ValidateDateRange(request.StartDate, request.EndDate) is { } dateError)
                    return dateError;

                if (!string.IsNullOrWhiteSpace(request.ClientId))
                {
                    var existingStop = await db.Stops
                        .Include(s => s.TravelModes)
                        .FirstOrDefaultAsync(s => s.ClientId == request.ClientId);

                    if (existingStop is not null)
                    {
                        return Results.Ok(new
                        {
                            existingStop.Id,
                            existingStop.ClientId,
                            existingStop.TripId,
                            existingStop.Title,
                            existingStop.Description,
                            existingStop.StartDate,
                            existingStop.EndDate,
                            existingStop.CreatedAt,
                            existingStop.UpdatedAt,
                            existingStop.Country,
                            existingStop.OrderIndex,
                            TravelModes = existingStop.TravelModes.Select(x => x.Mode).ToList()
                        });
                    }
                }

                var now = DateTime.UtcNow;
                var travelModes = EndpointValidation.NormalizeTravelModes(request.TravelModes);

                var nextOrderIndex = await db.Stops
                    .Where(s => s.TripId == tripId)
                    .MaxAsync(s => (int?)s.OrderIndex) ?? 0;
        
                var stop = new Stop
                {
                    Id = Guid.NewGuid(),
                    ClientId = string.IsNullOrWhiteSpace(request.ClientId) ? null : request.ClientId,
                    TripId = tripId,
                    Title = request.Title.Trim(),
                    Description = request.Description,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    Country = request.Country,
                    OrderIndex = nextOrderIndex + 1,
                    CreatedAt = now,
                    UpdatedAt = now,
                    TravelModes = travelModes
                        .Select(m => new StopTravelMode { Mode = m })
                        .ToList()
                };

                db.Stops.Add(stop);
                await db.SaveChangesAsync();

                return Results.Created($"/trips/{tripId}/stops/{stop.Id}", new
                {
                    stop.Id,
                    stop.ClientId,
                    stop.TripId,
                    stop.Title,
                    stop.Description,
                    stop.StartDate,
                    stop.EndDate,
                    stop.CreatedAt,
                    stop.UpdatedAt,
                    stop.Country,
                    stop.OrderIndex,
                    TravelModes = stop.TravelModes.Select(x => x.Mode)
                });
            }
            catch (Exception)
            {
                return Results.Problem("Could not create stop.");
            }
        });

        app.MapPut("/stops/{stopId:guid}", async (AppDbContext db, Guid stopId, UpdateStopRequest request) =>
        {
            if (EndpointValidation.ValidateTitle(request.Title) is { } titleError)
                return titleError;

            if (EndpointValidation.ValidateDateRange(request.StartDate, request.EndDate) is { } dateError)
                return dateError;

            var stop = await db.Stops
                .Include(s => s.TravelModes)
                .FirstOrDefaultAsync(s => s.Id == stopId);

            if (stop is null) return Results.NotFound();

            var travelModes = EndpointValidation.NormalizeTravelModes(request.TravelModes);

            stop.Title = request.Title.Trim();
            stop.Description = request.Description;
            stop.StartDate = request.StartDate;
            stop.EndDate = request.EndDate;
            stop.Country = request.Country;
            stop.OrderIndex = request.OrderIndex ?? stop.OrderIndex;
            stop.UpdatedAt = DateTime.UtcNow;

            db.StopTravelModes.RemoveRange(stop.TravelModes);
            stop.TravelModes = travelModes
                .Select(m => new StopTravelMode { StopId = stop.Id, Mode = m })
                .ToList();

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                stop.Id,
                stop.ClientId,
                stop.TripId,
                stop.Title,
                stop.Description,
                stop.StartDate,
                stop.EndDate,
                stop.CreatedAt,
                stop.UpdatedAt,
                stop.Country,
                stop.OrderIndex,
                TravelModes = stop.TravelModes.Select(x => x.Mode).ToList()
            });
        });

        app.MapDelete("/stops/{stopId:guid}", async (AppDbContext db, Guid stopId) =>
        {
            var stop = await db.Stops.FindAsync(stopId);
            if (stop is null) return Results.NotFound();

            db.Stops.Remove(stop);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
